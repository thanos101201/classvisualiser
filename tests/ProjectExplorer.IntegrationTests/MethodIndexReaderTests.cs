using System.Text.Json;
using Data;
using Forest.Methods;
using ProjectExplorer.IntegrationTests.Fixtures;

namespace ProjectExplorer.IntegrationTests;

public class MethodIndexReaderTests
{
    [Fact]
    public async Task GetMethodAsync_loads_entry_from_method_index_json()
    {
        var repoRoot = Path.Combine(Path.GetTempPath(), $"pe-repo-{Guid.NewGuid():N}");
        const string folder = "TestFix";
        var solutionDir = Path.Combine(repoRoot, folder);
        Directory.CreateDirectory(solutionDir);

        var sourcePath = Path.Combine(solutionDir, "sample.cs");
        var (caller, _) = CallGraphCompilationFixture.GetExpectedShards(sourcePath);

        var index = new Dictionary<string, MethodMetadata>
        {
            [caller.Method.MethodHash] = caller.Method,
        };

        var indexPath = Path.Combine(solutionDir, $"{folder}MethodIndex.json");
        await File.WriteAllTextAsync(
            indexPath,
            JsonSerializer.Serialize(index, new JsonSerializerOptions { WriteIndented = true }));

        var reader = new MethodIndexReader(repoRoot);
        var loaded = await reader.GetMethodAsync(folder, caller.Method.MethodHash);

        Assert.NotNull(loaded);
        Assert.Equal("Run", loaded.Name);
        Assert.NotEmpty(loaded.Calls);
    }
}
