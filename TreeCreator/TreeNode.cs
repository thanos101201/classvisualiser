using ContentInterpreter;

namespace TreeCreator;

public class TreeNode(string name, TokenType tokenType = TokenType.NONE, string content = "")
{
    public string? Name { get; set; } = name;

    public TokenType? Type { get; set; } = tokenType;

    public List<TreeNode> Children { get; init; } = new();

    public string Content { get; set; } = content;
}