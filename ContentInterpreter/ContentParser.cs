using Microsoft.VisualBasic;
using TreeCreator;

namespace ContentInterpreter;

public class ContentParser(string fileContent, TreeManager manager)
{
    private readonly Stack<string> _stk = new();

    private readonly List<string> _lst = new();

    private readonly Dictionary<string , TokenType> _tokenMap = new()
    {
        {"class", TokenType.CLASS},
        {"interface", TokenType.INTERFACE},
        {":", TokenType.COLON},
        {"{", TokenType.START_BRACE},
        {"}", TokenType.END_BRACE},
        {"abstract", TokenType.ABSTRACT},
        {"record", TokenType.RECORD},
        {"()", TokenType.METHOD},
        {",", TokenType.COMA},
        {"get;", TokenType.PROPERTY}
    };

    public void Parse()
    {
        var tokens = fileContent.Split('\n');
        foreach(var ele in tokens)
        {
            var tok = ele.Split(' ');
            for(var i=0;i<tok.Length;i++)
            {
                if(_tokenMap.TryGetValue(tok[i], out var tkTyp)){
                    if(tkTyp == TokenType.CLASS || tkTyp == TokenType.INTERFACE || tkTyp == TokenType.RECORD)
                    {
                        try
                        {
                            _stk.Push(tok[i+1]);
                            manager.AddNode(tok[i+1], tkTyp, fileContent);
                        }
                        catch
                        {
                            Console.WriteLine($"{tok[i]} ---- {ele}");
                        }
                    }
                    if(tkTyp == TokenType.COLON)
                    {
                        var j=i;
                        while (j < tok.Length)
                        {
                            if(tok[j] != "where")
                            {
                                _lst.Add(tok[j++]);
                            }
                            else
                            {
                                break;
                            }
                        }
                    }
                }
            }
            if(_stk.Count > 0)
            {
                var top = _stk.Pop();
                foreach(var parent in _lst)
                {
                    manager.AddChileNode(parent, top);
                }
            }
        }
    }
}