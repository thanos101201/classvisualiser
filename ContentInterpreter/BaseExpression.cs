using TreeCreator;

namespace ContentInterpreter;

public abstract class BaseExpression(TreeManager manager)
{
    protected abstract TokenType TokenType { get; }

    protected abstract TreeNode Interpret(string content);
}