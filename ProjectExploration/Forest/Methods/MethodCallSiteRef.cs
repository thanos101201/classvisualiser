namespace Forest.Methods;

/// <summary>One invocation inside a method body (no source text stored).</summary>
public record MethodCallSiteRef(
    SourceSpan Span,
    string? CalleeMethodHash,
    string? CalleeDisplayName);
