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

        foreach (var project in solution.Projects)
        {
            var compilation = await project.GetCompilationAsync();
            _projectNodeMap.Add(project.Name, new());

            foreach (var tree in compilation.SyntaxTrees)
            {
                var model = compilation.GetSemanticModel(tree);
                var root = await tree.GetRootAsync();

                foreach (var cls in root.DescendantNodes().OfType<ClassDeclarationSyntax>())
                {
                    var symbol = model.GetDeclaredSymbol(cls) as INamedTypeSymbol;
                    var parent = symbol.BaseType;                 // may be object
                    var ifaces = symbol.Interfaces;               // direct
                    var allIfaces = symbol.AllInterfaces;
                    var nameSpace = symbol.ContainingNamespace.ToDisplayString();      // transitive
                    // Walk the full chain:
                    var childNode = CreateNode(NodeType.Leave, symbol.Name, symbol.ContainingNamespace.ToDisplayString());
                    _projectNodeMap[project.Name].Add(childNode.HashName);
                    for (var t = symbol.BaseType; t != null; t = t.BaseType)
                    {
                        if(t == null || t.Name == "Object" || t.Name == "Window")
                        {
                            continue;
                        }

                        var parentNode = CreateNode(NodeType.Leave, t.Name, $"{project.Name}.{t.ContainingNamespace.ToDisplayString()}");
                        nodeManager.AddRelation(childNode, parentNode);
                        Console.WriteLine($"{t.BaseType}, {t.Name}, {symbol.Name}");
                    }

                    foreach(var item in allIfaces)
                    {
                        if(item == null)
                        {
                            continue;
                        }

                        var parentNode = CreateNode(NodeType.Leave, item.Name, $"{project.Name}.{item.ContainingNamespace.ToDisplayString()}");
                        nodeManager.AddRelation(childNode, parentNode);
                    }
                }
                var node = nodeManager.GetSerializedNodes();
                await repository.WriteContentAsync(node, @$"{project.FilePath}/{project.Name}");
            }
        }

        var relations = nodeManager.GetRelations();
        await repository.WriteContentAsync(relations, @$"Index");
        await repository.WriteContentAsync(JsonSerializer.Serialize(_projectNodeMap, new JsonSerializerOptions{WriteIndented=true}), "ProjectsNodeIndex");
    }

    private TreeNode CreateNode(NodeType nodeType, string name, string nameSpace)
    {
        return new TreeNode()
        {
            Type = nodeType,
            Name = name,
            HashName = TreeNode.GenerateMD5($"{nameSpace}.{name}"),
            NameSpace = nameSpace
        };
    }
}