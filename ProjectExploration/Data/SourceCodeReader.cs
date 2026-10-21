namespace Data;

public record SourceSnippet(
    string FilePath,
    int StartLine,
    int EndLine,
    IReadOnlyList<string> Lines);

public class SourceCodeReader
{
    private readonly List<string> _allowedRoots;

    public SourceCodeReader(IEnumerable<string> allowedRoots)
    {
        _allowedRoots = allowedRoots
            .Select(Path.GetFullPath)
            .Where(Directory.Exists)
            .Distinct()
            .ToList();
    }

    public SourceSnippet ReadLines(string filePath, int startLine, int endLine)
    {
        if (startLine < 1 || endLine < startLine)
            throw new ArgumentException("Invalid line range.");

        var fullPath = Path.GetFullPath(filePath);
        if (!IsPathAllowed(fullPath))
            throw new UnauthorizedAccessException("Path is outside allowed source roots.");

        if (!File.Exists(fullPath))
            throw new FileNotFoundException(fullPath);

        var allLines = File.ReadAllLines(fullPath);
        var start = Math.Min(startLine - 1, allLines.Length);
        var end = Math.Min(endLine, allLines.Length);
        var slice = allLines.Skip(start).Take(end - start).ToList();

        return new SourceSnippet(fullPath, startLine, endLine, slice);
    }

    private bool IsPathAllowed(string fullPath)
    {
        if (_allowedRoots.Count == 0)
            return true;

        return _allowedRoots.Any(root =>
            fullPath.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.Ordinal)
            || fullPath.Equals(root, StringComparison.Ordinal));
    }
}
