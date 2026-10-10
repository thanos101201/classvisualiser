using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Forest;

public class NodeManager
{
    private Dictionary<string, HashSet<string>> _relations = new();

    private Dictionary<string, TreeNode> _nodes = new();

    /// <summary>
    /// Adds a relation between the parent and
    /// child type.
    /// </summary>
    /// <param name="child"></param>
    /// <param name="parent"></param>
    public void AddRelation(TreeNode child, TreeNode parent)
    {
        var p = GetOrRegister(parent);
        var c = GetOrRegister(child);

        p.Children.Add(c.HashName);
        c.Parents.Add(p.HashName);

        if (!_relations.TryGetValue(p.HashName, out var set))
            _relations[p.HashName] = set = new HashSet<string>();
        set.Add(c.HashName);
    }

    private TreeNode GetOrRegister(TreeNode node)
    {
        if (_nodes.TryGetValue(node.HashName, out var existing))
            return existing;

        _nodes[node.HashName] = node;
        return node;
    }

    /// <summary>
    /// Returns the children for the provided parent.
    /// In case if the parent node does not exist then
    /// it returns null.
    /// </summary>
    /// <param name="parent"></param>
    /// <returns></returns>
    public HashSet<string>? GetChildren(string parent)
    {
        if(_relations.TryGetValue(parent, out var child))
        {
            return child;
        }

        return null;
    }

    public IEnumerable<TreeNode> GetHierarchy(string nodeHash)
    {
        var ans = new List<TreeNode>();
        
        if(_relations.TryGetValue(nodeHash, out var children))
        {
            while(children?.Count > 0)
            {
                var childNode = _nodes.Where(x => children.Contains(x.Key)).Select(x => x.Value).ToList();
                ans.AddRange(childNode);
                _ = _relations.TryGetValue(nodeHash, out children);
            }
        }

        return (IEnumerable<TreeNode>)ans;
    }

    public string GetSerializedNodes() => JsonSerializer.Serialize(_nodes, new JsonSerializerOptions{WriteIndented=true});

    public void ClearNodes() => _nodes.Clear();

    public string GetRelations() => JsonSerializer.Serialize(_relations, new JsonSerializerOptions{WriteIndented=true});
}