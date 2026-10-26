using Data;
using Forest.Methods;
using ProjectExplorer.IntegrationTests.Fixtures;

namespace ProjectExplorer.IntegrationTests;

public class MethodShardStoreTests
{
    [Fact]
    public async Task Write_and_read_round_trips_shard()
    {
        var repoRoot = Path.Combine(Path.GetTempPath(), $"pe-repo-{Guid.NewGuid():N}");
        var store = new MethodShardStore(repoRoot);
        var sourcePath = Path.Combine(repoRoot, "sample.cs");
        Directory.CreateDirectory(repoRoot);

        var (_, callee) = CallGraphCompilationFixture.GetExpectedShards(sourcePath);
        const string folder = "TestFix";

        await store.WriteAsync(folder, callee);

        var read = await store.TryReadAsync(folder, callee.Method.MethodHash);
        Assert.NotNull(read);
        Assert.Equal(callee.Method.MethodHash, read.Method.MethodHash);
        Assert.Equal(callee.Method.Name, read.Method.Name);
        Assert.Equal(callee.Lines, read.Lines);
        Assert.Equal(callee.StartLine, read.StartLine);
    }
}
