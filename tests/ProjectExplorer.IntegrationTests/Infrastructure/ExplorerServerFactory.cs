using ExplorerServer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ProjectExplorer.IntegrationTests.Infrastructure;

public class ExplorerServerFactory : WebApplicationFactory<Program>
{
    private readonly string _repositoryPath;

    public ExplorerServerFactory(string repositoryPath)
    {
        _repositoryPath = repositoryPath;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("RepositoryLocation", _repositoryPath);
        builder.UseSetting("SourceRoots:0", _repositoryPath);

        builder.ConfigureServices(services =>
        {
            var backfillDescriptors = services
                .Where(d =>
                    d.ServiceType == typeof(IHostedService)
                    && d.ImplementationType == typeof(MethodShardBackfillHostedService))
                .ToList();

            foreach (var descriptor in backfillDescriptors)
                services.Remove(descriptor);
        });
    }
}
