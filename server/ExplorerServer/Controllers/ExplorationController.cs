using Analyzation;
using Data;
using Forest;
using Microsoft.AspNetCore.Mvc;

namespace ExplorerServer.Controllers;

[ApiController]
[Route("api")]
public class ExplorationController(
    SolutionBundleReader bundleReader,
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

    /// <summary>Manifest only — relations file names, sln file, node files.</summary>
    [HttpGet("solutions/{folder}/manifest")]
    public ActionResult<SolutionBundleManifest> GetManifest(string folder)
    {
        var manifest = bundleReader.DiscoverManifest(folder);
        return manifest == null ? NotFound() : Ok(manifest);
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
