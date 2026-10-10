using System.Security.Cryptography;
using System.Text;

namespace Forest;

public record TreeNode
{
    public Guid ID { get; init; } = Guid.NewGuid();
    public NodeType Type { get; set; }

    public string HashName {get; set;}

    public string NameSpace { get; set; }

    public string Name { get; set; }

    public List<string> Children { get; init; } = new();

    public List<string> Parents { get; init; } = new();

    /// <summary>
    /// Generates the hash value for the fully
    /// qualified name of any type.
    /// </summary>
    /// <param name="input"></param>
    /// <returns></returns>
    public static string GenerateMD5(string input)
    {
        byte[] inputBytes = Encoding.UTF8.GetBytes(input);
        byte[] hashBytes = MD5.HashData(inputBytes);

        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}