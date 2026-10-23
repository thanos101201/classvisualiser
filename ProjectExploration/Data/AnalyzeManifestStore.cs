using System.Text.Json;

namespace Data;

public class AnalyzeManifestStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    private readonly string _repositoryRoot;

    public AnalyzeManifestStore(string repositoryRoot)
    {
        _repositoryRoot = repositoryRoot;
    }

    public string GetManifestPath(string folder) =>
        Path.Combine(_repositoryRoot, folder, SolutionAnalyzeManifest.FileName);

    public async Task WriteAsync(SolutionAnalyzeManifest manifest, CancellationToken cancellationToken = default)
    {
        var path = GetManifestPath(manifest.Folder);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var json = JsonSerializer.Serialize(manifest, JsonOptions);
        var temp = path + ".tmp";
        await File.WriteAllTextAsync(temp, json, cancellationToken);
        File.Move(temp, path, overwrite: true);
    }

    public async Task<SolutionAnalyzeManifest?> TryReadAsync(
        string folder,
        CancellationToken cancellationToken = default)
    {
        var path = GetManifestPath(folder);
        if (!File.Exists(path))
            return null;

        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<SolutionAnalyzeManifest>(stream, JsonOptions, cancellationToken);
    }
}
