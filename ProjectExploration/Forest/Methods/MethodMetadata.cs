using Forest;
using Microsoft.CodeAnalysis;

namespace Forest.Methods;

/// <summary>Cached method facts only — source is loaded from disk on demand.</summary>
public record MethodMetadata(
    string MethodHash,
    string TypeHash,
    string Name,
    string FilePath,
    SourceSpan BodySpan,
    IReadOnlyList<MethodCallSiteRef> Calls)
{
    public static string CreateMethodHash(IMethodSymbol symbol)
    {
        var typeFqn = symbol.ContainingType.ToDisplayString(
            Microsoft.CodeAnalysis.SymbolDisplayFormat.FullyQualifiedFormat);
        var paramTypes = string.Join(
            ",",
            symbol.Parameters.Select(p =>
                p.Type.ToDisplayString(Microsoft.CodeAnalysis.SymbolDisplayFormat.FullyQualifiedFormat)));
        return TreeNode.GenerateMD5($"{typeFqn}.{symbol.Name}({paramTypes})");
    }

    public static string CreateTypeHash(INamedTypeSymbol typeSymbol)
    {
        var ns = typeSymbol.ContainingNamespace.ToDisplayString();
        return TreeNode.GenerateMD5($"{ns}.{typeSymbol.Name}");
    }
}
