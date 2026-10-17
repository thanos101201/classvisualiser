using Microsoft.CodeAnalysis.CSharp;

namespace Analyzation;

public class MethodAnalyzer : IAnalyzer
{
    public async Task AnalyzeAsync(object content)
    {
        var strContent = (string)content;
        try
        {
            var member = SyntaxFactory.ParseMemberDeclaration(strContent);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"{ex.Message} \n {ex.StackTrace}");
        }
    }
}
