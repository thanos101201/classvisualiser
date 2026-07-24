namespace ProjectReader;

public class DirectoryReader(string directoryPath)
{
    public IEnumerable<KeyValuePair<string, string>> GetDirectoryContent()
    {
        var ans = new List<KeyValuePair<string, string>>();
        var paths = new List<string>();
        DFS(directoryPath, ref paths);
        foreach(var ele in paths)
        {
            if(ele.Contains("obj") || ele.Contains("bin"))continue;
            var content = FileReader.ReadFile(ele);
            ans.Add(new KeyValuePair<string, string>(ele, content));
        }

        return ans;
    }

    private void DFS(string path, ref List<string> paths)
    {
        try
        {
            var directories = Directory.EnumerateDirectories(path);
            var files = Directory.EnumerateFiles(path);
            foreach(var ele in files)
            {
                if(ele.Contains("obj") || ele.Contains("bin"))continue;
                if(!ele.EndsWith(".cs"))continue;
                paths.Add(@$"{ele}");
            }

            if(directories.Count() == 0) return;
            foreach(var ele in directories)
            {
                if(ele.Contains("obj") || ele.Contains("bin"))continue;
                // if(!ele.EndsWith(".cs"))continue;
                DFS(@$"{ele}",ref paths);
            }
        }
        catch{}
    }
}