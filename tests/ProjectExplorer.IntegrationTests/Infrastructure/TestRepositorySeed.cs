using System.Text.Json;
using Data;
using Forest.Methods;
using ProjectExplorer.IntegrationTests.Fixtures;

namespace ProjectExplorer.IntegrationTests.Infrastructure;

public static class TestRepositorySeed
{
    public const string SolutionFolder = "TestFix";

    public static async Task<(string RepositoryRoot, MethodShard CallerRun)> SeedMethodApiFixtureAsync()
    {
        var repoRoot = Path.Combine(Path.GetTempPath(), $"pe-api-{Guid.NewGuid():N}");
        var solutionDir = Path.Combine(repoRoot, SolutionFolder);
        Directory.CreateDirectory(solutionDir);

        var sourcePath = Path.Combine(solutionDir, "sample.cs");
        var (caller, callee) = CallGraphCompilationFixture.GetExpectedShards(sourcePath);

        var index = new Dictionary<string, MethodMetadata>
        {
            [caller.Method.MethodHash] = caller.Method,
            [callee.Method.MethodHash] = callee.Method,
        };

        await File.WriteAllTextAsync(
            Path.Combine(solutionDir, $"{SolutionFolder}MethodIndex.json"),
            JsonSerializer.Serialize(index, new JsonSerializerOptions { WriteIndented = true }));

        var shardStore = new MethodShardStore(repoRoot);
        await shardStore.WriteAsync(SolutionFolder, caller);
        await shardStore.WriteAsync(SolutionFolder, callee);

        return (repoRoot, caller);
    }
}
