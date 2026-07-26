using ContentInterpreter;

namespace TreeCreator;

public class TreeManager
{
    private readonly Dictionary<string, TreeNode> _map = new();

    public void AddChileNode(string parentName, string chldName)
    {
        if(!_map.TryGetValue(parentName, out var parent))
        {
            parent = new TreeNode(parentName, TokenType.NONE, "");
        }
        
        if(_map.TryGetValue(chldName, out var child))
        {
            parent.Children.Add(child);
        }
    }

    public void AddNode(string childName, TokenType tokenType, string content)
    {
        if(_map.TryGetValue(childName, out _))
        {
            _map[childName].Type = tokenType;
            _map[childName].Content = content;
        }
        else
        {
            _map.Add(childName, new(childName, tokenType, content));
        }
    }

    public Dictionary<string, TreeNode> GetMapping() => _map;
}