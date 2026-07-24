using ContentInterpreter;

namespace TreeCreator;

public class TreeManager
{
    private readonly Dictionary<string, TreeNode> _map = new();

    public void AddChileNode(string parentName, string chldName)
    {
        if(_map.TryGetValue(parentName, out var parent) && _map.TryGetValue(chldName, out var child))
        {
            parent.Children.Add(child);
        }
    }

    public void AddNode(string childName, TokenType tokenType, string content)
    {
        _map.TryAdd(childName, new(childName, tokenType, content));
    }

    public Dictionary<string, TreeNode> GetMapping() => _map;
}