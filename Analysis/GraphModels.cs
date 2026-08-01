using ContentInterpreter;

namespace Analysis;

public record GraphNode(string Id, string Label, string Type, List<HierarchyMethod> Methods);

public record GraphEdge(string From, string To);

public record GraphData(IReadOnlyList<GraphNode> Nodes, IReadOnlyList<GraphEdge> Edges);
