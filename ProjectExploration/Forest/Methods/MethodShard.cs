namespace Forest.Methods;

/// <summary>Precomputed method body for fast API reads (one small JSON file per method).</summary>
public record MethodShard(
    MethodMetadata Method,
    IReadOnlyList<string> Lines,
    int StartLine);
