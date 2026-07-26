using ContentInterpreter;
using ProjectReader;
using TreeCreator;

namespace Analysis;

public class HierarchyAnalyzer
{
    public GraphData Analyze(string projectPath)
    {
        var reader = new DirectoryReader(projectPath);
        var content = reader.GetDirectoryContent();
        var manager = new TreeManager();

        foreach (var file in content)
        {
            var parser = new ContentParser(file.Value, manager);
            parser.Parse();
        }

        return ToGraphData(manager.GetMapping());
    }

    private static GraphData ToGraphData(Dictionary<string, TreeNode> mapping)
    {
        var nodes = new Dictionary<string, GraphNode>(StringComparer.Ordinal);
        var edges = new List<GraphEdge>();

        foreach (var (name, node) in mapping)
        {
            AddNode(nodes, name, node.Type);
        }

        foreach (var (parentName, parent) in mapping)
        {
            foreach (var child in parent.Children)
            {
                var normalizedParent = NormalizeName(parentName);
                var normalizedChild = NormalizeName(child.Name);

                if (!IsValidTypeName(normalizedParent) || !IsValidTypeName(normalizedChild))
                {
                    continue;
                }

                AddNode(nodes, normalizedChild, child.Type);
                edges.Add(new GraphEdge(normalizedParent, normalizedChild));
            }
        }

        return new GraphData(nodes.Values.ToList(), edges);
    }

    private static string NormalizeName(string? name) => (name ?? string.Empty).Trim().TrimEnd(',');

    private static bool IsValidTypeName(string name) =>
        !string.IsNullOrWhiteSpace(name) && name != ":";

    private static void AddNode(Dictionary<string, GraphNode> nodes, string name, TokenType? type)
    {
        if (nodes.ContainsKey(name))
        {
            return;
        }

        var typeLabel = type?.ToString() ?? TokenType.NONE.ToString();
        nodes[name] = new GraphNode(name, name, typeLabel);
    }
}
