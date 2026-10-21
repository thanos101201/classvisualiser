namespace Forest.Methods;

/// <summary>1-based line/column span in a source file.</summary>
public record SourceSpan(
    int StartLine,
    int StartColumn,
    int EndLine,
    int EndColumn);
