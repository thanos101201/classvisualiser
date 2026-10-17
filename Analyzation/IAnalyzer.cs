namespace Analyzation;

public interface IAnalyzer
{
    public Task AnalyzeAsync(object content);
}