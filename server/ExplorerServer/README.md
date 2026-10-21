# ExplorerServer

ASP.NET Core API that serves the graph cache from `ProjectExploration/repository/` to the React graph viewer.

## Run

```bash
cd server/ExplorerServer
dotnet run
```

Default URL: `http://localhost:5243` (see `Properties/launchSettings.json`).

Configure repository path in `appsettings.Development.json`:

```json
"RepositoryLocation": "/absolute/path/to/ProjectExploration/repository"
```

If empty, `Program.cs` resolves `../../ProjectExploration/repository` relative to this project.

## API (for graph-viewer)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/solutions` | List solution bundle manifests |
| GET | `/api/solutions/{folder}/manifest` | Manifest only |
| GET | `/api/solutions/{folder}/bundle` | Relations + project index + merged nodes (main graph load) |
| GET | `/api/solutions/{folder}/nodes/{nodeHash}` | Single `TreeNode` for detail panel |
| POST | `/api/solutions/{folder}/analyze?slnPath=...` | Re-run Roslyn analysis |

CORS allows `http://localhost:5173` (Vite dev server).

## Client

```bash
cd graph-viewer
npm run dev
```

Vite proxies `/api` → `http://localhost:5243`. The viewer uses the API when `/api/solutions` responds; otherwise it falls back to static JSON under `/repository`.

Optional: `VITE_API_BASE_URL=http://localhost:5243` if not using the proxy.
