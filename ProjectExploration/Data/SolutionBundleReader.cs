using System.Text.Json;
using Forest;

namespace Data;

public record SolutionBundleManifest(
    string SolutionName,
    string Folder,
    string RelationsFile,
    string SlnFile,
    IReadOnlyList<string> NodeFiles);

public record SolutionBundleData(
    SolutionBundleManifest Manifest,
    Dictionary<string, List<string>> Relations,
    Dictionary<string, List<string>> ProjectsIndex,
    Dictionary<string, TreeNode> NodeStore);

public class SolutionBundleReader
{
    private readonly string _repositoryRoot;

    public SolutionBundleReader(string repositoryRoot)
    {
        _repositoryRoot = repositoryRoot;
    }

    public IReadOnlyList<SolutionBundleManifest> ListSolutions()
    {
        if (!Directory.Exists(_repositoryRoot))
            return Array.Empty<SolutionBundleManifest>();

        var manifests = new List<SolutionBundleManifest>();
        foreach (var dir in Directory.GetDirectories(_repositoryRoot))
        {
            var folder = Path.GetFileName(dir);
            var manifest = DiscoverManifest(folder);
            if (manifest != null)
                manifests.Add(manifest);
        }

        return manifests.OrderBy(m => m.Folder).ToList();
    }

    public SolutionBundleManifest? DiscoverManifest(string folder)
    {
        var dir = Path.Combine(_repositoryRoot, folder);
        if (!Directory.Exists(dir))
            return null;

        var files = Directory.GetFiles(dir).Select(Path.GetFileName).Where(f => f != null).Cast<string>().ToList();
        var slnCandidates = files.Where(f => f.EndsWith(".sln.json", StringComparison.OrdinalIgnoreCase)).ToList();
        if (slnCandidates.Count == 0)
            return null;

        var slnFile = slnCandidates.Find(f => f.Equals($"{folder}.sln.json", StringComparison.OrdinalIgnoreCase))
                      ?? (slnCandidates.Count == 1 ? slnCandidates[0] : null);
        if (slnFile == null)
            return null;

        var slnBase = slnFile[..^".sln.json".Length];
        var relationCandidates = files
            .Where(f => f.EndsWith(".json", StringComparison.OrdinalIgnoreCase)
                        && !f.EndsWith(".sln.json", StringComparison.OrdinalIgnoreCase)
                        && !f.EndsWith("Nodes.json", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (relationCandidates.Count == 0)
            return null;

        var relationsFile = relationCandidates.Find(f => f.Equals($"{folder}.json", StringComparison.OrdinalIgnoreCase))
                            ?? relationCandidates.Find(f => f.Equals($"{slnBase}.json", StringComparison.OrdinalIgnoreCase))
                            ?? (relationCandidates.Count == 1 ? relationCandidates[0] : null);

        if (relationsFile == null)
            return null;

        var nodeFiles = files
            .Where(f => f.EndsWith("Nodes.json", StringComparison.OrdinalIgnoreCase))
            .OrderBy(f => f)
            .ToList();

        var solutionName = relationsFile[..^".json".Length];
        return new SolutionBundleManifest(solutionName, folder, relationsFile, slnFile, nodeFiles);
    }

    public async Task<SolutionBundleData> LoadBundleAsync(string folder, CancellationToken cancellationToken = default)
    {
        var manifest = DiscoverManifest(folder)
                       ?? throw new FileNotFoundException($"No solution bundle in '{folder}'.");

        var solutionDir = Path.Combine(_repositoryRoot, folder);
        var relations = await ReadJsonAsync<Dictionary<string, List<string>>>(
            Path.Combine(solutionDir, manifest.RelationsFile), cancellationToken);
        var projectsIndex = await ReadJsonAsync<Dictionary<string, List<string>>>(
            Path.Combine(solutionDir, manifest.SlnFile), cancellationToken);

        var nodeStore = new Dictionary<string, TreeNode>();
        foreach (var nodeFile in manifest.NodeFiles)
        {
            var nodes = await ReadJsonAsync<Dictionary<string, TreeNode>>(
                Path.Combine(solutionDir, nodeFile), cancellationToken);
            foreach (var (key, node) in nodes)
                nodeStore[key] = node;
        }

        return new SolutionBundleData(manifest, relations, projectsIndex, nodeStore);
    }

    public async Task<TreeNode?> GetNodeAsync(string folder, string nodeHash, CancellationToken cancellationToken = default)
    {
        var manifest = DiscoverManifest(folder)
                       ?? throw new FileNotFoundException($"No solution bundle in '{folder}'.");

        var solutionDir = Path.Combine(_repositoryRoot, folder);
        foreach (var nodeFile in manifest.NodeFiles)
        {
            var nodes = await ReadJsonAsync<Dictionary<string, TreeNode>>(
                Path.Combine(solutionDir, nodeFile), cancellationToken);
            if (nodes.TryGetValue(nodeHash, out var node))
                return node;
        }

        return null;
    }

    private static async Task<T> ReadJsonAsync<T>(string path, CancellationToken cancellationToken)
    {
        if (!File.Exists(path))
            throw new FileNotFoundException(path);

        await using var stream = File.OpenRead(path);
        var result = await JsonSerializer.DeserializeAsync<T>(stream, cancellationToken: cancellationToken);
        if (result == null)
            throw new InvalidDataException($"Empty or invalid JSON: {path}");
        return result;
    }
}
