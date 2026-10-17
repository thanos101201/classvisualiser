# Graph viewer (React)

Interactive 3D explorer for JSON graph caches produced by the ProjectExplorer .NET analyzer.

**Full documentation** (analyzer + cache format + architecture): see the [root README](../README.md).

## Quick run

```bash
npm install
npm run dev
```

Reads `../repository/` in development (no copy step).

## Solution bundle

Each analyzed solution is a folder under `repository/{Name}/` with:

- `{Name}.json` — edges (parent hash → child hashes)
- `{Name}.sln.json` — project → hashes
- `{Project}Nodes.json` — hash → `TreeNode` metadata

The UI merges these on **HashName**. Use **Browse…** to load the same file set from disk.

Details: [root README — Repository layout](../README.md#repository-layout-solution-bundle).
