
using Analyzation;
public class Program
{
    public static async Task Main(string[] args)
    {
        await AnalyzationClient.AnalyzeAsync("/Users/pratiksinghthakur/perproj/dotnet/Aimmy/Aimmy2.sln");
    }
}