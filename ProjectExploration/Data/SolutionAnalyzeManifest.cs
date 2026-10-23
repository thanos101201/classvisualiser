namespace Data;

/// <summary>
/// Metadata written after each successful Roslyn analyze run (commit, time, cache file paths).
/// Stored as <c>repository/{Folder}/analyze-manifest.json</c>.
/// </summary>
public record SolutionAnalyzeManifest(
    int SchemaVersion,
    string SolutionName,
    string Folder,
    string? SlnPath,
    DateTime AnalyzedAtUtc,
    string? CommitSha,
    string? CommitShaShort,
    IReadOnlyList<string> Projects,
    string RelationsFile,
    string SlnIndexFile,
    IReadOnlyList<string> NodeFiles,
    IReadOnlyList<string> MethodIndexFiles,
    string MethodShardsDirectory)
{
    public const int CurrentSchemaVersion = 1;
    public const string FileName = "analyze-manifest.json";
}
