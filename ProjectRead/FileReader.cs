using System.Text;

namespace ProjectReader;
public class FileReader
{

    public static string ReadFile(string filePath)
    {
        using var reader = new StreamReader(filePath, Encoding.UTF8);

        var contentBuilder = new StringBuilder();
        while (true)
        {
            var line = reader.ReadLine();
            if(line == null)
            {
                break;
            }

            contentBuilder.AppendLine(line);
        }

        return contentBuilder.ToString();

    }
}