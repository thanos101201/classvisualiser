using System.Diagnostics;

namespace Data;

public static class GitMetadata
{
    public static string? TryGetCommitSha(string pathFromSolution)
    {
        var repoRoot = TryFindGitRoot(pathFromSolution);
        if (repoRoot == null)
            return null;

        try
        {
            using var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "git",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                },
            };
            process.StartInfo.ArgumentList.Add("-C");
            process.StartInfo.ArgumentList.Add(repoRoot);
            process.StartInfo.ArgumentList.Add("rev-parse");
            process.StartInfo.ArgumentList.Add("HEAD");

            if (!process.Start())
                return null;

            var output = process.StandardOutput.ReadToEnd().Trim();
            process.WaitForExit(5_000);
            return process.ExitCode == 0 && output.Length > 0 ? output : null;
        }
        catch
        {
            return null;
        }
    }

    private static string? TryFindGitRoot(string startPath)
    {
        try
        {
            var full = File.Exists(startPath)
                ? Path.GetDirectoryName(Path.GetFullPath(startPath))
                : Path.GetFullPath(startPath);

            if (string.IsNullOrEmpty(full))
                return null;

            var dir = new DirectoryInfo(full);
            while (dir != null)
            {
                if (Directory.Exists(Path.Combine(dir.FullName, ".git")))
                    return dir.FullName;
                dir = dir.Parent;
            }
        }
        catch
        {
            // ignore
        }

        return null;
    }

    public static string? ShortSha(string? fullSha) =>
        string.IsNullOrEmpty(fullSha) || fullSha.Length < 7 ? fullSha : fullSha[..7];
}
