using ContentInterpreter;
using ProjectReader;
using TreeCreator;

namespace Analysis;

public class HierarchyAnalyzer
{
    public async Task<GraphData> Analyze(string projectPath)
    {
        var analyser = new ClassAnalyzer();
        var graph = await analyser.Analyse(projectPath);

        return ToGraphData(graph.Nodes, graph.Edges);
    }

    private GraphData ToGraphData(List<HierarchyNode> nodes, List<HierarchyEdge> edges)
    {
        var graphNodes = new List<GraphNode>();
        var graphEdges = new List<GraphEdge>();

        foreach(var node in nodes)
        {
            graphNodes.Add(new(node.Id, node.Name, node.Kind.ToString(), node.Methods));
        }

        foreach(var edge in edges)
        {
            graphEdges.Add(new(edge.From, edge.To));
        }

        return new(graphNodes, graphEdges);
    }
}