using Analyzation;
using Data;
using Forest;
using Forest.Methods;
using Microsoft.AspNetCore.Mvc;

namespace ExplorerServer.Controllers;

[ApiController]
[Route("api")]
public class ExplorationController(
    SolutionBundleReader bundleReader,
    AnalyzeManifestStore analyzeManifestStore,
    MethodIndexReader methodIndexReader,
    MethodShardStore methodShardStore,
    SourceCodeReader sourceCodeReader,
    AnalyzationClient analyzationClient,
    IConfiguration configuration,
    ILogger<ExplorationController> logger) : ControllerBase
{
    /// <summary>Lists solution folders under repository/ (e.g. Aimmy2).</summary>
    [HttpGet("solutions")]
    public ActionResult<IReadOnlyList<SolutionBundleManifest>> ListSolutions()
    {
        return Ok(bundleReader.ListSolutions());
    }

    /// <summary>Bundle file manifest — relations file names, sln file, node files (discovered from disk).</summary>
    [HttpGet("solutions/{folder}/manifest")]
    public ActionResult<SolutionBundleManifest> GetManifest(string folder)
    {
        var manifest = bundleReader.DiscoverManifest(folder);
        return manifest == null ? NotFound() : Ok(manifest);
    }

    /// <summary>Last analyze run metadata — UTC time, Git commit, paths to cache files.</summary>
    [HttpGet("solutions/{folder}/analyze-manifest")]
    public async Task<ActionResult<SolutionAnalyzeManifest>> GetAnalyzeManifestAsync(
        string folder,
        CancellationToken cancellationToken)
    {
        var manifest = await analyzeManifestStore.TryReadAsync(folder, cancellationToken);
        return manifest == null
            ? NotFound($"No analyze-manifest.json for '{folder}'. Run analyze first.")
            : Ok(manifest);
    }

    /// <summary>Full bundle for graph rendering (relations + project index + merged nodes).</summary>
    [HttpGet("solutions/{folder}/bundle")]
    public async Task<ActionResult<SolutionBundleResponse>> GetBundleAsync(string folder, CancellationToken cancellationToken)
    {
        try
        {
            var data = await bundleReader.LoadBundleAsync(folder, cancellationToken);
            return Ok(new SolutionBundleResponse(
                data.Manifest,
                data.Relations,
                data.ProjectsIndex,
                data.NodeStore));
        }
        catch (FileNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    /// <summary>Single TreeNode by HashName for the detail panel.</summary>
    [HttpGet("solutions/{folder}/nodes/{nodeHash}")]
    public async Task<ActionResult<TreeNode>> GetNodeAsync(
        string folder,
        string nodeHash,
        CancellationToken cancellationToken)
    {
        var node = await bundleReader.GetNodeAsync(folder, nodeHash, cancellationToken);
        return node == null ? NotFound($"Node '{nodeHash}' not found.") : Ok(node);
    }

    [HttpGet("solutions/{folder}/types/{typeHash}/methods")]
    public async Task<ActionResult<IReadOnlyList<MethodMetadata>>> GetTypeMethodsAsync(
        string folder,
        string typeHash,
        CancellationToken cancellationToken)
    {
        var methods = await methodIndexReader.GetMethodsForTypeAsync(folder, typeHash, cancellationToken);
        return Ok(methods);
    }

    [HttpGet("solutions/{folder}/methods/{methodHash}")]
    public async Task<ActionResult<MethodMetadata>> GetMethodMetadataAsync(
        string folder,
        string methodHash,
        CancellationToken cancellationToken)
    {
        var method = await methodIndexReader.GetMethodAsync(folder, methodHash, cancellationToken);
        return method == null ? NotFound() : Ok(method);
    }

    /// <summary>Method metadata plus body source in one response (fewer round-trips for the call graph).</summary>
    [HttpGet("solutions/{folder}/methods/{methodHash}/source")]
    public async Task<ActionResult<MethodSourceView>> GetMethodSourceViewAsync(
        string folder,
        string methodHash,
        CancellationToken cancellationToken)
    {
        var shard = await methodShardStore.TryReadAsync(folder, methodHash, cancellationToken);
        if (shard != null)
            return Ok(new MethodSourceView(shard.Method, shard.Lines, shard.StartLine));

        var method = await methodIndexReader.GetMethodAsync(folder, methodHash, cancellationToken);
        if (method == null)
            return NotFound();

        try
        {
            var snippet = sourceCodeReader.ReadLines(
                method.FilePath,
                method.BodySpan.StartLine,
                method.BodySpan.EndLine);
            return Ok(new MethodSourceView(method, snippet.Lines, snippet.StartLine));
        }
        catch (FileNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("source/snippet")]
    public ActionResult<SourceSnippet> GetSourceSnippet(
        [FromQuery] string path,
        [FromQuery] int startLine,
        [FromQuery] int endLine)
    {
        try
        {
            return Ok(sourceCodeReader.ReadLines(path, startLine, endLine));
        }
        catch (FileNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>Re-run Roslyn analysis. Body or query must include full path to .sln file.</summary>
    [HttpPost("solutions/{folder}/analyze")]
    public async Task<IActionResult> AnalyzeAsync(string folder, [FromQuery] string? slnPath, CancellationToken cancellationToken)
    {
        var path = slnPath ?? configuration[$"Solutions:{folder}:SlnPath"];
        if (string.IsNullOrWhiteSpace(path))
        {
            return BadRequest("Provide slnPath query parameter or Solutions:{folder}:SlnPath in configuration.");
        }

        if (!System.IO.File.Exists(path))
        {
            return BadRequest($"Solution file not found: {path}");
        }

        try
        {
            await analyzationClient.AnalyzeAsync(path);
            return Accepted(new { folder, message = "Analysis completed." });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Analysis failed for {Sln}", path);
            return StatusCode(StatusCodes.Status500InternalServerError, "Analysis failed.");
        }
    }
}

public record SolutionBundleResponse(
    SolutionBundleManifest Manifest,
    Dictionary<string, List<string>> Relations,
    Dictionary<string, List<string>> ProjectsIndex,
    Dictionary<string, TreeNode> NodeStore);

public record MethodSourceView(
    MethodMetadata Method,
    IReadOnlyList<string> Lines,
    int StartLine);
