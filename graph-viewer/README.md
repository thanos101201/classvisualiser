# ProjectExplorer — 3D graph viewer

React app that visualizes the **TreeNode** graph written by ProjectExplorer under [`../repository/`](../repository/).

## Data layout

| File | Purpose |
|------|---------|
| `repository/ProjectsNodeIndex.json` | Project → node `HashName` list |
| `repository/{Solution}.json` | Parent hash → child hashes (e.g. `Aimmy2.json`) |
| `repository/{Project}/nodes.json` | Optional hash → `TreeNode` metadata |

The dev server reads JSON directly from `../repository` (no copy step). Production builds copy `.json` files into `dist/repository`.

The graph draws **only nodes that appear in the relations JSON** (as a parent key or child hash). `ProjectsNodeIndex.json` lists every class in a project from analysis; many of those may not appear in a partial `Aimmy2.json`. Use **Show classes without edges** in the UI to include index-only classes as isolated nodes.

## Run

```bash
cd graph-viewer
npm install
npm run dev
```

Open the URL from the terminal (typically `http://localhost:5173`).

After re-running the .NET analyzer, refresh the browser to pick up updated JSON.
