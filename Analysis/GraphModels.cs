namespace Analysis;

public record GraphNode(string Id, string Label, string Type);

public record GraphEdge(string From, string To);

public record GraphData(IReadOnlyList<GraphNode> Nodes, IReadOnlyList<GraphEdge> Edges);
