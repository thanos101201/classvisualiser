using System.ComponentModel;
using System.Text.Json;
using System.Threading.Tasks;
using Models;

namespace Data;


public class FileRepository
{
    private readonly string _directoryPath;

    public FileRepository(string directoryPath)
    {
        _directoryPath = directoryPath;
    }

    public bool CheckFileExistence(string project, string slnName)
    {
        var directory = Directory.GetFiles(@$"{_directoryPath}/{slnName}").Contains(@$"{_directoryPath}/{slnName}/{project}.json");
        foreach(var ele in Directory.GetFiles($"{_directoryPath}"))
        {
            Console.WriteLine($"{ele}");
        }
        return directory;
    }

    public async Task<string> GetProjectJsonAsync(string project, string slnName)
    {
        if (!CheckFileExistence(project, slnName))
        {
            throw new ArgumentException($"Json for the {project} does not exist.");
        }

        using var reader = new StreamReader(File.OpenRead($"{_directoryPath}/{slnName}/{project}.json"));
        var content = await reader.ReadToEndAsync();

        return content;
    }

    public T LoadData<T> (string projectName)
    {
        var reader = new StreamReader(File.OpenRead(@$"{_directoryPath}/{projectName}.json"));
        var content = reader.ReadToEnd();

        var data = JsonSerializer.Deserialize<T>(content);

        return data;
    }

    public async Task WriteContentAsync(string content, string fileName)
    {
        // Strip any directory parts so fileName can't escape _directoryPath (e.g. "../x")
        fileName = $"{fileName}.json";
        var safeName = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(safeName))
            throw new ArgumentException("A valid file name is required.", nameof(fileName));

        Directory.CreateDirectory(_directoryPath);

        var path = $"{_directoryPath}/{fileName}"; //Path.Combine(_directoryPath, safeName);
        Console.WriteLine($"Path is : {path}, {safeName}, {fileName}");
        var tempPath = path + ".tmp";

        // Write to a temp file first so a crash never leaves a half-written file
        await File.WriteAllTextAsync(tempPath, content);
        File.Move(tempPath, path, overwrite: true);
    }

    public void CreateDirectory(string projectName)
    {
        Directory.CreateDirectory(@$"{_directoryPath}/{projectName}");
    }

    public async Task GetNodeAsync(string projectName, string nodeHash, string slnName)
    {
        using var reader = new StreamReader(File.OpenRead($"{_directoryPath}/{slnName}/{projectName}Nodes.json"));
        var content = await reader.ReadToEndAsync();

        var nodeCollection = JsonSerializer.Deserialize<TreeNodeCollection>(content);
        
    }
}