using Analyzation;
using Forest.Methods;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace ProjectExplorer.IntegrationTests.Fixtures;

/// <summary>Minimal two-class compilation with one resolved method call.</summary>
public static class CallGraphCompilationFixture
{
    public const string Source = """
        namespace CallGraphFixture;

        public class Caller
        {
            public void Run()
            {
                Callee.Invoke();
            }
        }

        public static class Callee
        {
            public static void Invoke()
            {
            }
        }
        """;

    public static Compilation CreateCompilation(string sourceFilePath)
    {
        var syntaxTree = CSharpSyntaxTree.ParseText(Source, path: sourceFilePath);
        var references = new[]
        {
            MetadataReference.CreateFromFile(typeof(object).Assembly.Location),
            MetadataReference.CreateFromFile(typeof(Enumerable).Assembly.Location),
        };

        return CSharpCompilation.Create(
            "CallGraphFixture",
            [syntaxTree],
            references,
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));
    }

    public static Dictionary<string, MethodShard> Analyze(string sourceFilePath) =>
        MethodCallAnalyzer.AnalyzeCompilation(CreateCompilation(sourceFilePath));

    public static (MethodShard CallerRun, MethodShard CalleeInvoke) GetExpectedShards(string sourceFilePath)
    {
        var shards = Analyze(sourceFilePath);
        var caller = shards.Values.Single(s => s.Method.Name == "Run");
        var callee = shards.Values.Single(s => s.Method.Name == "Invoke");
        return (caller, callee);
    }
}
