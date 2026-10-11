using System.Text.Json;
using Data;
using Forest;
using Microsoft.Build.Locator;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.MSBuild;

namespace Analyzation;

public class AnalyzationClient(NodeManager nodeManager, FileRepository repository)
{
    private Dictionary<string, HashSet<string>> _projectNodeMap = new();

    public async Task AnalyzeAsync(string slnPath)
    {
        MSBuildLocator.RegisterDefaults();
        using var workspace = MSBuildWorkspace.Create();
        var solution = await workspace.OpenSolutionAsync(slnPath);
        var solutionName = Path.GetFileNameWithoutExtension(solution.FilePath);

        foreach (var project in solution.Projects)
        {
            // if (repository.CheckFileExistence(project.Name))
            // {
            //     continue;
            // }

            var compilation = await project.GetCompilationAsync();
            _projectNodeMap.Add(project.Name, new());
            repository.CreateDirectory(project.Name);

            foreach (var tree in compilation?.SyntaxTrees ?? [])
            {
                var model = compilation?.GetSemanticModel(tree);
                var root = await tree.GetRootAsync();

                foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
                {
                    var symbol = model?.GetDeclaredSymbol(cls) as INamedTypeSymbol;
                    var parent = symbol?.BaseType;                 // may be object
                    var ifaces = symbol?.Interfaces;               // direct
                    var allIfaces = symbol?.AllInterfaces;
                    var nameSpace = symbol?.ContainingNamespace.ToDisplayString();      // transitive
                    var paths = GetSourceFiles(symbol!);
                    // Walk the full chain:
                    var childNode = CreateNode(NodeType.Leave, symbol?.Name ?? "", symbol?.ContainingNamespace.ToDisplayString() ?? "", paths);
                    _projectNodeMap[project.Name].Add(childNode.HashName);
                    for (var t = symbol?.BaseType; t != null; t = t?.BaseType)
                    {
                        if(t == null || t.Name == "Object" || t.Name == "Window")
                        {
                            continue;
                        }
                        var parentPaths = GetSourceFiles(t);

                        var parentNode = CreateNode(NodeType.Leave, t.Name, $"{project.Name}.{t.ContainingNamespace.ToDisplayString()}", parentPaths);
                        nodeManager.AddRelation(childNode, parentNode);
                        // Console.WriteLine($"{t.BaseType}, {t.Name}, {symbol.Name}");
                    }

                    foreach(var item in allIfaces ?? [])
                    {
                        if(item == null)
                        {
                            continue;
                        }

                        var interFPath = GetSourceFiles(item);
                        var parentNode = CreateNode(NodeType.Leave, item.Name, $"{project.Name}.{item.ContainingNamespace.ToDisplayString()}", interFPath);
                        nodeManager.AddRelation(childNode, parentNode);
                    }
                }
                var node = nodeManager.GetSerializedNodes();
                await repository.WriteContentAsync(node, @$"{solutionName}/{project.Name}Nodes");
            }
        }

        var relations = nodeManager.GetRelations();
        await repository.WriteContentAsync(relations, @$"{solutionName}/{solutionName}");
        await repository.WriteContentAsync(JsonSerializer.Serialize(_projectNodeMap, new JsonSerializerOptions{WriteIndented=true}), @$"{solutionName}/{solutionName}.sln");
    }

    private TreeNode CreateNode(NodeType nodeType, string name, string nameSpace, List<string> filePaths)
    {
        return new TreeNode()
        {
            Type = nodeType,
            Name = name,
            HashName = TreeNode.GenerateMD5($"{nameSpace}.{name}"),
            NameSpace = nameSpace,
            FilePaths = filePaths
        };
    }

    private static List<string> GetSourceFiles(INamedTypeSymbol symbol) =>
    symbol.Locations
        .Where(l => l.IsInSource)
        .Select(l => l.SourceTree!.FilePath)
        .Distinct()
        .ToList();
}