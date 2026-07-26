using ContentInterpreter;
using TreeCreator;

var reader = new ProjectReader.DirectoryReader(@"/Users/pratiksinghthakur/perproj/dotnet/Aimmy");
var content = reader.GetDirectoryContent();
var manager = new TreeManager();
foreach (var ele in content)
{
    var parser = new ContentParser(ele.Value, manager);
    parser.Parse();
}

var mp = manager.GetMapping();
foreach (var ele in mp)
{
    if (ele.Value.Children.Count > 0)
    {
        Console.WriteLine(ele.Key);
        foreach (var ch in ele.Value.Children)
        {
            Console.Write($"{ch.Name}, ");
        }
        Console.WriteLine("++++++++++++++++");
    }
}
