namespace Data;

public class FileRepository
{
    private readonly string _directoryPath;

    public FileRepository(string directoryPath)
    {
        _directoryPath = directoryPath;
    }

    public async Task WriteContentAsync(string content, string fileName)
    {
        // Strip any directory parts so fileName can't escape _directoryPath (e.g. "../x")
        fileName = $"{fileName}.json";
        var safeName = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(safeName))
            throw new ArgumentException("A valid file name is required.", nameof(fileName));

        Directory.CreateDirectory(_directoryPath);

        var path = Path.Combine(_directoryPath, safeName);
        var tempPath = path + ".tmp";

        // Write to a temp file first so a crash never leaves a half-written file
        await File.WriteAllTextAsync(tempPath, content);
        File.Move(tempPath, path, overwrite: true);
    }
}