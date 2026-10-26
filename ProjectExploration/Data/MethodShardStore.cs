using System.Text.Json;
using Forest.Methods;

namespace Data;

public class MethodShardStore
{
    public const string ShardDirectoryName = "MethodShards";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    private readonly string _repositoryRoot;

    public MethodShardStore(string repositoryRoot)
    {
        _repositoryRoot = repositoryRoot;
    }

    public string GetShardDirectory(string solutionFolder) =>
        Path.Combine(_repositoryRoot, solutionFolder, ShardDirectoryName);

    public string GetShardPath(string solutionFolder, string methodHash) =>
        Path.Combine(GetShardDirectory(solutionFolder), $"{methodHash}.json");

    public async Task<MethodShard?> TryReadAsync(
        string solutionFolder,
        string methodHash,
        CancellationToken cancellationToken = default)
    {
        var path = GetShardPath(solutionFolder, methodHash);
        if (!File.Exists(path))
            return null;

        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<MethodShard>(stream, JsonOptions, cancellationToken);
    }

    public async Task WriteAsync(
        string solutionFolder,
        MethodShard shard,
        CancellationToken cancellationToken = default)
    {
        var dir = GetShardDirectory(solutionFolder);
        Directory.CreateDirectory(dir);
        var path = GetShardPath(solutionFolder, shard.Method.MethodHash);
        var json = JsonSerializer.Serialize(shard, JsonOptions);
        var temp = path + ".tmp";
        await File.WriteAllTextAsync(temp, json, cancellationToken);
        File.Move(temp, path, overwrite: true);
    }

    public async Task WriteManyAsync(
        string solutionFolder,
        IEnumerable<MethodShard> shards,
        CancellationToken cancellationToken = default)
    {
        foreach (var shard in shards)
            await WriteAsync(solutionFolder, shard, cancellationToken);
    }

    public void ClearSolutionShards(string solutionFolder)
    {
        var dir = GetShardDirectory(solutionFolder);
        if (Directory.Exists(dir))
            Directory.Delete(dir, recursive: true);
    }

    public int CountShards(string solutionFolder)
    {
        var dir = GetShardDirectory(solutionFolder);
        return !Directory.Exists(dir)
            ? 0
            : Directory.EnumerateFiles(dir, "*.json").Count();
    }

    public bool IsShardComplete(string solutionFolder, int methodCount) =>
        methodCount > 0 && CountShards(solutionFolder) >= methodCount;
}
