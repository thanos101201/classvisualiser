using System.Net;
using System.Text.Json;
using ProjectExplorer.IntegrationTests.Infrastructure;

namespace ProjectExplorer.IntegrationTests;

public class MethodSourceApiTests : IAsyncLifetime
{
    private string _repositoryRoot = null!;
    private string _callerMethodHash = null!;
    private ExplorerServerFactory _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        var (repoRoot, caller) = await TestRepositorySeed.SeedMethodApiFixtureAsync();
        _repositoryRoot = repoRoot;
        _callerMethodHash = caller.Method.MethodHash;
        _factory = new ExplorerServerFactory(_repositoryRoot);
        _client = _factory.CreateClient();
    }

    public Task DisposeAsync()
    {
        _client.Dispose();
        _factory.Dispose();
        if (Directory.Exists(_repositoryRoot))
            Directory.Delete(_repositoryRoot, recursive: true);
        return Task.CompletedTask;
    }

    [Fact]
    public async Task GetMethodSource_returns_metadata_and_body_lines_from_shard()
    {
        var response = await _client.GetAsync(
            $"/api/solutions/{TestRepositorySeed.SolutionFolder}/methods/{_callerMethodHash}/source");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        await using var stream = await response.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(stream);
        var root = doc.RootElement;

        Assert.Equal(_callerMethodHash, root.GetProperty("method").GetProperty("methodHash").GetString());
        Assert.Equal("Run", root.GetProperty("method").GetProperty("name").GetString());

        var lines = root.GetProperty("lines").EnumerateArray().Select(e => e.GetString()).ToList();
        Assert.Contains(lines, l => l != null && l.Contains("Callee.Invoke();"));

        Assert.True(root.GetProperty("startLine").GetInt32() >= 1);
    }

    [Fact]
    public async Task GetMethodMetadata_returns_index_entry()
    {
        var response = await _client.GetAsync(
            $"/api/solutions/{TestRepositorySeed.SolutionFolder}/methods/{_callerMethodHash}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        await using var stream = await response.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(stream);
        Assert.Equal("Run", doc.RootElement.GetProperty("name").GetString());
        Assert.True(doc.RootElement.GetProperty("calls").GetArrayLength() > 0);
    }

    [Fact]
    public async Task GetMethodSource_returns_not_found_for_unknown_hash()
    {
        var response = await _client.GetAsync(
            $"/api/solutions/{TestRepositorySeed.SolutionFolder}/methods/doesnotexist/source");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
