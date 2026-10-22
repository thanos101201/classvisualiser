using System.Text.Json;
using Forest.Methods;

namespace Data;

public class MethodIndexReader
{
    private readonly string _repositoryRoot;
    private readonly object _cacheLock = new();
    private readonly Dictionary<string, (string Signature, Dictionary<string, MethodMetadata> Index)> _folderCache =
        new();

    public MethodIndexReader(string repositoryRoot)
    {
        _repositoryRoot = repositoryRoot;
    }

    private string BuildFolderSignature(string folder)
    {
        var parts = new List<string>();
        foreach (var file in ListMethodIndexFiles(folder))
        {
            var path = Path.Combine(_repositoryRoot, folder, file);
            var ticks = File.Exists(path) ? File.GetLastWriteTimeUtc(path).Ticks : 0L;
            parts.Add($"{file}:{ticks}");
        }

        return string.Join('|', parts);
    }

    private async Task<Dictionary<string, MethodMetadata>> GetIndexAsync(
        string folder,
        CancellationToken cancellationToken)
    {
        var signature = BuildFolderSignature(folder);
        lock (_cacheLock)
        {
            if (_folderCache.TryGetValue(folder, out var hit) && hit.Signature == signature)
                return hit.Index;
        }

        var index = await LoadMergedIndexAsync(folder, cancellationToken);
        lock (_cacheLock)
        {
            _folderCache[folder] = (signature, index);
        }

        return index;
    }

    public IReadOnlyList<string> ListMethodIndexFiles(string folder)
    {
        var dir = Path.Combine(_repositoryRoot, folder);
        if (!Directory.Exists(dir))
            return Array.Empty<string>();

        return Directory.GetFiles(dir)
            .Select(Path.GetFileName)
            .Where(f => f != null && f.EndsWith("MethodIndex.json", StringComparison.OrdinalIgnoreCase))
            .Cast<string>()
            .OrderBy(f => f)
            .ToList();
    }

    public async Task<Dictionary<string, MethodMetadata>> LoadMergedIndexAsync(
        string folder,
        CancellationToken cancellationToken = default)
    {
        var merged = new Dictionary<string, MethodMetadata>();
        foreach (var file in ListMethodIndexFiles(folder))
        {
            var path = Path.Combine(_repositoryRoot, folder, file);
            await using var stream = File.OpenRead(path);
            var chunk = await JsonSerializer.DeserializeAsync<Dictionary<string, MethodMetadata>>(
                stream,
                cancellationToken: cancellationToken);
            if (chunk == null)
                continue;
            foreach (var (key, value) in chunk)
                merged[key] = value;
        }

        return merged;
    }

    public async Task<IReadOnlyList<MethodMetadata>> GetMethodsForTypeAsync(
        string folder,
        string typeHash,
        CancellationToken cancellationToken = default)
    {
        var index = await GetIndexAsync(folder, cancellationToken);
        return index.Values
            .Where(m => m.TypeHash == typeHash)
            .OrderBy(m => m.Name)
            .ToList();
    }

    public async Task<MethodMetadata?> GetMethodAsync(
        string folder,
        string methodHash,
        CancellationToken cancellationToken = default)
    {
        var index = await GetIndexAsync(folder, cancellationToken);
        return index.TryGetValue(methodHash, out var method) ? method : null;
    }
}
