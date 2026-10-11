# ProjectExplorer — 3D graph viewer

React app that visualizes **TreeNode** graphs exported by ProjectExplorer.

## Solution bundle (three JSON files)

Files live under `repository/{SolutionName}/` and are joined on **HashName**:

| File | Role |
|------|------|
| `{Solution}.json` | **Edges** — parent hash → child hashes (inheritance / interfaces) |
| `{Solution}.sln.json` | **Project index** — project name → list of class hashes in that project |
| `{Project}Nodes.json` | **Metadata** — hash → `TreeNode` (`Name`, `NameSpace`, `FilePaths`, …) |

Example for Aimmy:

```
repository/Aimmy2/
  Aimmy2.json          ← hierarchy (edges)
  Aimmy2.sln.json      ← which hashes belong to project "Aimmy2"
  Aimmy2Nodes.json     ← class names and source paths for those hashes
```

**How they bind:**

1. Load `Aimmy2.json` → build graph **links** between hashes.
2. Load `Aimmy2.sln.json` → **Project** dropdown filters which hashes can be shown (optional orphans via checkbox).
3. Load `Aimmy2Nodes.json` (and any other `*Nodes.json` in the folder) → **labels** and detail panel text for each hash.

Multi-project solutions add more entries in `.sln.json` and one `{ProjectName}Nodes.json` per project; all node files are merged into one lookup map.

## Run

```bash
cd graph-viewer
npm install
npm run dev
```

Use the **Solution** dropdown for folders under `repository/`, or **Browse…** and select `Aimmy2.json`, `Aimmy2.sln.json`, and `Aimmy2Nodes.json` together (multi-select).

By default only hashes that appear in `{Solution}.json` are drawn. Enable **Show classes without edges** to include index-only classes from `.sln.json`.
