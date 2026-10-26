using ProjectExplorer.IntegrationTests.Fixtures;

namespace ProjectExplorer.IntegrationTests;

public class MethodCallAnalyzerTests
{
    [Fact]
    public void AnalyzeCompilation_finds_caller_and_callee_with_resolved_call_edge()
    {
        var sourcePath = Path.Combine(Path.GetTempPath(), $"callgraph-{Guid.NewGuid():N}.cs");
        var (caller, callee) = CallGraphCompilationFixture.GetExpectedShards(sourcePath);

        Assert.Equal("Run", caller.Method.Name);
        Assert.Equal("Invoke", callee.Method.Name);
        Assert.NotEmpty(caller.Lines);
        Assert.Contains(caller.Lines, line => line.Contains("Callee.Invoke();", StringComparison.Ordinal));

        var call = Assert.Single(caller.Method.Calls, c => c.CalleeMethodHash != null);
        Assert.Equal(callee.Method.MethodHash, call.CalleeMethodHash);
        Assert.False(string.IsNullOrWhiteSpace(call.CalleeDisplayName));
    }

    [Fact]
    public void AnalyzeCompilation_assigns_stable_method_hashes()
    {
        var sourcePath = Path.Combine(Path.GetTempPath(), "stable.cs");
        var first = CallGraphCompilationFixture.Analyze(sourcePath);
        var second = CallGraphCompilationFixture.Analyze(sourcePath);

        Assert.Equal(
            first.Keys.OrderBy(k => k),
            second.Keys.OrderBy(k => k));
    }
}
