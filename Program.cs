
using Analyzation;
using Data;
using Forest;
using Microsoft.Build.Tasks.Deployment.ManifestUtilities;
public class Program
{
    public static async Task Main(string[] args)
    {
        var nodeManager = new NodeManager();
        var repository = new FileRepository("/Users/pratiksinghthakur/perproj/dotnet/ProjectExplorer/repository");
        var analyzer = new AnalyzationClient(nodeManager, repository);
        await analyzer.AnalyzeAsync("/Users/pratiksinghthakur/perproj/dotnet/Aimmy/Aimmy2.sln");
    }
}