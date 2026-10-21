using Forest.Methods;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;

namespace Analyzation;

public static class MethodCallAnalyzer
{
    public static Dictionary<string, MethodMetadata> AnalyzeCompilation(Compilation compilation)
    {
        var methods = new Dictionary<string, MethodMetadata>();

        foreach (var tree in compilation.SyntaxTrees)
        {
            var model = compilation.GetSemanticModel(tree);
            var root = tree.GetRoot();

            foreach (var typeDecl in root.DescendantNodes().OfType<TypeDeclarationSyntax>())
            {
                var typeSymbol = model.GetDeclaredSymbol(typeDecl) as INamedTypeSymbol;
                if (typeSymbol == null)
                    continue;

                var typeHash = MethodMetadata.CreateTypeHash(typeSymbol);

                foreach (var member in typeSymbol.GetMembers().OfType<IMethodSymbol>())
                {
                    if (member.MethodKind != MethodKind.Ordinary || member.IsImplicitlyDeclared)
                        continue;

                    if (!member.Locations.Any(l => l.IsInSource))
                        continue;

                    var syntax = member.DeclaringSyntaxReferences.FirstOrDefault()?.GetSyntax();
                    if (syntax == null)
                        continue;

                    var bodySpan = ToSpan(syntax);
                    var calls = CollectCallSites(syntax, model);

                    var meta = new MethodMetadata(
                        MethodMetadata.CreateMethodHash(member),
                        typeHash,
                        member.Name,
                        tree.FilePath,
                        bodySpan,
                        calls);

                    methods[meta.MethodHash] = meta;
                }
            }
        }

        return methods;
    }

    private static List<MethodCallSiteRef> CollectCallSites(
        SyntaxNode methodSyntax,
        SemanticModel model)
    {
        var calls = new List<MethodCallSiteRef>();

        foreach (var invocation in methodSyntax.DescendantNodes().OfType<InvocationExpressionSyntax>())
        {
            var info = model.GetSymbolInfo(invocation);
            var callee = info.Symbol as IMethodSymbol
                         ?? info.CandidateSymbols.OfType<IMethodSymbol>().FirstOrDefault();

            string? calleeHash = null;
            string? display = null;

            if (callee is { Locations: var locs } && locs.Any(l => l.IsInSource))
            {
                calleeHash = MethodMetadata.CreateMethodHash(callee);
                display = callee.ToDisplayString();
            }
            else if (invocation.Expression is MemberAccessExpressionSyntax ma)
            {
                display = ma.Name.ToString();
            }
            else
            {
                display = invocation.Expression.ToString();
            }

            var span = ToSpan(invocation);
            calls.Add(new MethodCallSiteRef(span, calleeHash, display));
        }

        return calls;
    }

    private static SourceSpan ToSpan(SyntaxNode node)
    {
        var span = node.SyntaxTree.GetLineSpan(node.Span);
        var start = span.StartLinePosition;
        var end = span.EndLinePosition;
        return new SourceSpan(
            start.Line + 1,
            start.Character + 1,
            end.Line + 1,
            end.Character + 1);
    }
}
