using Data;
using Forest.Methods;

namespace ExplorerServer;

/// <summary>
/// Builds per-method shard files from the merged index when shards are missing (e.g. before re-analyze).
/// </summary>
public sealed class MethodShardBackfillHostedService(
    SolutionBundleReader bundleReader,
    MethodIndexReader methodIndexReader,
    MethodShardStore shardStore,
    SourceCodeReader sourceCodeReader,
    ILogger<MethodShardBackfillHostedService> logger) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        _ = Task.Run(() => BackfillAsync(cancellationToken), cancellationToken);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task BackfillAsync(CancellationToken cancellationToken)
    {
        try
        {
            foreach (var manifest in bundleReader.ListSolutions())
            {
                cancellationToken.ThrowIfCancellationRequested();

                var index = await methodIndexReader.LoadMergedIndexAsync(manifest.Folder, cancellationToken);
                if (index.Count == 0)
                    continue;

                if (shardStore.IsShardComplete(manifest.Folder, index.Count))
                    continue;

                var existing = shardStore.CountShards(manifest.Folder);
                logger.LogInformation(
                    "Building method shards for {Folder} ({Existing}/{Total} present)…",
                    manifest.Folder,
                    existing,
                    index.Count);

                var written = 0;
                foreach (var meta in index.Values)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    if (File.Exists(shardStore.GetShardPath(manifest.Folder, meta.MethodHash)))
                        continue;

                    try
                    {
                        var snippet = sourceCodeReader.ReadLines(
                            meta.FilePath,
                            meta.BodySpan.StartLine,
                            meta.BodySpan.EndLine);
                        await shardStore.WriteAsync(
                            manifest.Folder,
                            new MethodShard(meta, snippet.Lines, snippet.StartLine),
                            cancellationToken);
                        written++;
                    }
                    catch (Exception ex)
                    {
                        logger.LogDebug(ex, "Skipped shard for method {Hash}", meta.MethodHash);
                    }
                }

                var total = shardStore.CountShards(manifest.Folder);
                logger.LogInformation(
                    "Method shards for {Folder}: {Total}/{Expected} ({Written} written this run).",
                    manifest.Folder,
                    total,
                    index.Count,
                    written);
            }
        }
        catch (OperationCanceledException)
        {
            // shutdown
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Method shard backfill failed.");
        }
    }
}
