using Analyzation;
using Data;
using ExplorerServer;
using Forest;

var builder = WebApplication.CreateBuilder(args);

var repositoryPath = builder.Configuration["RepositoryLocation"]
    ?? Path.Combine(builder.Environment.ContentRootPath, "..", "..", "ProjectExploration", "repository");
repositoryPath = Path.GetFullPath(repositoryPath);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:4173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var sourceRoots = builder.Configuration.GetSection("SourceRoots").Get<string[]>() ?? Array.Empty<string>();
if (sourceRoots.Length == 0)
{
    sourceRoots =
    [
        Path.GetFullPath(Path.Combine(repositoryPath, "..", "..", "..")),
        Path.GetFullPath(Path.Combine(repositoryPath, "..")),
    ];
}

builder.Services.AddSingleton(new FileRepository(repositoryPath));
builder.Services.AddSingleton(new SolutionBundleReader(repositoryPath));
builder.Services.AddSingleton(new MethodIndexReader(repositoryPath));
builder.Services.AddSingleton(new MethodShardStore(repositoryPath));
builder.Services.AddSingleton(new AnalyzeManifestStore(repositoryPath));
builder.Services.AddSingleton(new SourceCodeReader(sourceRoots));
builder.Services.AddHostedService<MethodShardBackfillHostedService>();
builder.Services.AddSingleton<NodeManager>();
builder.Services.AddSingleton<AnalyzationClient>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.MapControllers();

app.Run();
