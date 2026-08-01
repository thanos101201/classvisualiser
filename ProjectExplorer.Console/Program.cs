using Microsoft.Build.Locator;

// using HierarchyExtraction;
using ContentInterpreter;
// namespace ProjectExplorer.Console;
public class Program
{
    public static async Task Main(string[] args)
    {
        MSBuildLocator.RegisterDefaults(); // first line, before any MSBuild-dependent types load
        Console.WriteLine("Enter the project path.");
        var path = Console.ReadLine();
        var analyser = new ClassAnalyzer();
        var graph = await analyser.Analyse(path);
        var nodes = graph.Nodes;
        var edges = graph.Edges;

        foreach(var ele in nodes)
        {
            Console.Write($"{ele.Name}, ");
        }

        foreach(var edge in edges)
        {
            Console.WriteLine($"{edge.To} --- {edge.From}");
        }
    }
}