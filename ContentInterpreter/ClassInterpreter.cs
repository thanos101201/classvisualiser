using TreeCreator;

namespace ContentInterpreter;

public class ClassInterpreter : BaseExpression
{
    public ClassInterpreter(TreeManager manager): base(manager)
    {
        
    }

    protected override TokenType TokenType => TokenType.CLASS;

    protected override TreeNode Interpret(string content)
    {
        throw new NotImplementedException();
    }
}