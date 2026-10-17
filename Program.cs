
using Analyzation;
using Data;
using Forest;
public class Program
{
    public static async Task Main(string[] args)
    {
        var nodeManager = new NodeManager();
        var repository = new FileRepository("/Users/pratiksinghthakur/perproj/dotnet/ProjectExplorer/repository");
        var analyzer = new AnalyzationClient(nodeManager, repository);
        await analyzer.AnalyzeAsync("/Users/pratiksinghthakur/perproj/dotnet/Aimmy/Aimmy2.sln");

        var className = TreeNode.GenerateMD5("Aimmy2.UILibrary.ADownloadGateway");
        var hierarchy = nodeManager.GetHierarchy(className);
        Console.WriteLine(className);
        foreach(var node in hierarchy)
        {
            Console.WriteLine(node.Name);
        }

    }
}