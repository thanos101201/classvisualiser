using Microsoft.Build.Locator;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.MSBuild;
using System.Text.Json;

namespace ContentInterpreter;

public record HierarchyNode(string Id, string Name, string Namespace, TokenType Kind);
public record HierarchyEdge(string From, string To, string Relation);

public class ClassAnalyzer
{
    private readonly Dictionary<string, HierarchyNode> _nodes = new();
    private readonly List<HierarchyEdge> _edges = new();

    static ClassAnalyzer()
    {
        // Must run exactly once, before any MSBuildWorkspace is created
        if (!MSBuildLocator.IsRegistered)
            MSBuildLocator.RegisterDefaults();
    }

    public async Task<(List<HierarchyNode> Nodes, List<HierarchyEdge> Edges)> Analyse(string projectPath)
    {
        using var workspace = MSBuildWorkspace.Create();
        workspace.WorkspaceFailed += (_, e) =>
            Console.Error.WriteLine($"[Workspace] {e.Diagnostic.Kind}: {e.Diagnostic.Message}");

        var project = await workspace.OpenProjectAsync(projectPath);
        var compilation = await project.GetCompilationAsync();
        if (compilation is null)
            throw new InvalidOperationException($"Could not compile project: {projectPath}");

        foreach (var document in project.Documents)
        {
            var tree = await document.GetSyntaxTreeAsync();
            var root = await document.GetSyntaxRootAsync();
            if (tree is null || root is null) continue;

            var semanticModel = compilation.GetSemanticModel(tree);

            // Covers class, interface, struct, record declarations
            var typeDeclarations = root.DescendantNodes().OfType<TypeDeclarationSyntax>();

            foreach (var typeDecl in typeDeclarations)
            {
                if (semanticModel.GetDeclaredSymbol(typeDecl) is not INamedTypeSymbol symbol)
                    continue;

                AddNode(symbol);

                // Base class, skipping System.Object noise
                if (symbol.BaseType is { SpecialType: not SpecialType.System_Object } baseType)
                {
                    AddNode(baseType);
                    _edges.Add(new HierarchyEdge(GetId(symbol), GetId(baseType), "inherits"));
                }

                // Directly implemented interfaces only (Interfaces, not AllInterfaces,
                // so you don't get a flattened/duplicated graph)
                foreach (var iface in symbol.Interfaces)
                {
                    AddNode(iface);
                    _edges.Add(new HierarchyEdge(GetId(symbol), GetId(iface), "implements"));
                }
            }
        }

        return (_nodes.Values.ToList(), _edges);
    }

    public async Task ExportToJsonAsync(string projectPath, string outputPath)
    {
        var (nodes, edges) = await Analyse(projectPath);
        var json = JsonSerializer.Serialize(new { nodes, edges }, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync(outputPath, json);
    }

    private void AddNode(INamedTypeSymbol symbol)
    {
        var id = GetId(symbol);
        if (_nodes.ContainsKey(id)) return;

        _nodes[id] = new HierarchyNode(
            Id: id,
            Name: symbol.Name,
            Namespace: symbol.ContainingNamespace?.ToDisplayString() ?? "",
            Kind: symbol.TypeKind switch
            {
                TypeKind.Interface => TokenType.INTERFACE,
                TypeKind.Struct => TokenType.STRUCT,
                _ when symbol.IsRecord => TokenType.RECORD,
                _ => TokenType.CLASS
            });
    }

    private static string GetId(INamedTypeSymbol symbol) =>
        symbol.ToDisplayString(SymbolDisplayFormat.FullyQualifiedFormat);
}