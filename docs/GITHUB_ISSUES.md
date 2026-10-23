# GitHub issues for [classvisualiser](https://github.com/thanos101201/classvisualiser)

Use this file to create issues on GitHub. Suggested **milestones**: `M0 Foundation` … `M8 C# Agent`, then `M9 Vectors`, `M10 Hardening`.

**Labels to create:** `analysis`, `api`, `agent`, `mcp`, `incidents`, `graph`, `frontend`, `testing`, `docs`, `security`, `retrieval`, `dx`

---

## Current stage (as of roadmap planning)

### Already implemented (no new issue unless you want “verify on CI” tasks)

| Area | Status | Key paths |
|------|--------|-----------|
| Type hierarchy analyze | Done | `AnalyzationClient.cs`, `NodeManager`, `{Solution}.json`, `*Nodes.json` |
| 3D graph viewer | Done | `graph-viewer/`, `buildGraphData.ts`, `GraphViewer3D.tsx` |
| Hash search & detail panel | Done | `App.tsx`, `NodeDetailPanel.tsx` |
| Method call analysis | Done | `MethodCallAnalyzer.cs`, `*MethodIndex.json` |
| Method shards (fast source) | Done | `MethodShardStore.cs`, `MethodShards/` (719 methods for Aimmy2) |
| ExplorerServer API | Done | `server/ExplorerServer/`, `ExplorationController.cs` |
| Method call graph UI | Done | `MethodCallGraphPanel.tsx`, persistent cards + SVG edges |
| Client method cache | Done | `methodViewCache.ts`, `GET .../methods/{hash}/source` |
| Shard backfill on startup | Done | `MethodShardBackfillHostedService.cs` |
| Root README (type + method docs) | Done | `README.md` |
| AI roadmap doc | Done | `docs/AI_AGENT_ROADMAP.md` |

### Not started (agent / incident path)

- Analyze manifest with **Git commit** / version skew warnings  
- **Log site** Roslyn index  
- **Annotations** store  
- **Incident** parsing & anchoring  
- **Evidence pack** + investigate API  
- **MCP server** (C#)  
- **C# investigation agent**  
- Vector / hybrid retrieval (optional)  
- Automated **tests** & **CI**

---

# Phase 0 — Foundation

## Issue: [P0.1] Add analyze manifest with Git commit SHA and timestamps

**Milestone:** M0 Foundation  
**Labels:** `analysis`, `foundation`, `docs`

### Context

Analysis writes JSON under `repository/{Solution}/` but there is no single manifest describing **when** analysis ran or **which Git commit** the cache corresponds to. Incident debugging needs this for commit skew warnings.

### Goal

Write and expose `manifest.json` per solution folder.

### Tasks

- Define `SolutionAnalyzeManifest` (solution name, `analyzedAtUtc`, `commitSha?`, `slnPath?`, project list, paths to relations/sln/nodes/method index/shard dir).
- Populate `commitSha` via `git rev-parse HEAD` when solution path is inside a git repo (fail gracefully).
- Write manifest in `AnalyzationClient` after successful analyze.
- `GET /api/solutions/{folder}/manifest` in ExplorerServer (extend or align with existing manifest endpoint).
- Document fields in root `README.md`.

### Acceptance criteria

- [ ] After `POST /api/solutions/{folder}/analyze`, `repository/{folder}/manifest.json` exists.
- [ ] Manifest includes `analyzedAtUtc` and `commitSha` when git is available.
- [ ] API returns the same JSON.

### Depends on

None.

### References

- `ProjectExploration/Analyzation/AnalyzationClient.cs`
- `server/ExplorerServer/Controllers/ExplorationController.cs`

---

## Issue: [P0.2] Add integration tests for method index, shards, and source API

**Milestone:** M0 Foundation  
**Labels:** `testing`, `analysis`, `api`

### Context

Method call graph and future MCP tools rely on `MethodCallAnalyzer`, shard files, and `GET .../methods/{hash}/source`. There are no automated regression tests.

### Goal

`dotnet test` project with a minimal fixture solution and WebApplicationFactory tests for ExplorerServer.

### Tasks

- Add `ProjectExploration.Tests` (or `ExplorerServer.Tests`) with a tiny `.sln` fixture (2 classes, 1 method call).
- Assert method index contains expected `methodHash` and `calls[]`.
- Assert shard write/read round-trip.
- API test: `GET .../methods/{hash}/source` returns lines + metadata.

### Acceptance criteria

- [ ] Tests run in CI (see P10.1).
- [ ] Failing analyzer change breaks tests visibly.

### Depends on

None.

---

## Issue: [P0.3] Align repository paths and document analyze entry points

**Milestone:** M0 Foundation  
**Labels:** `dx`, `docs`

### Context

Cache lives under `ProjectExploration/repository/`; console `Program.cs`, ExplorerServer `RepositoryLocation`, and Vite proxy must stay aligned.

### Goal

One documented path story and consistent defaults.

### Tasks

- Audit `Program.cs`, `appsettings.Development.json`, `vite.config.ts`.
- Update `graph-viewer/README.md` to mention API, method index, call graph (parity with root README).
- Optional: `dotnet run --project server/ExplorerServer` as primary analyze trigger in docs.

### Acceptance criteria

- [ ] New contributor can run analyze → API → viewer without path guesswork.
- [ ] `graph-viewer/README.md` links to method bundle files.

### Depends on

None.

---

# Phase 1 — Log sites (prod → code anchors)

## Issue: [P1.1] Define LogSite model and JSON schema

**Milestone:** M1 Log sites  
**Labels:** `analysis`, `schema`, `docs`

### Context

Production issues are tied to **log lines**. Method hashes alone are insufficient until we index **where** `Log.Information` / `ILogger` calls live.

### Goal

Stable `LogSite` records joinable to `methodHash`.

### Tasks

- Add types: `LogSiteId`, `LogSite` (methodHash, file, line, level?, messageTemplate, loggerKind).
- Document schema in `docs/schemas/LogSite.md`.

### Acceptance criteria

- [ ] Schema reviewed and stable enough for indexer implementation.

### Depends on

P0.1 (optional but recommended for manifest version).

---

## Issue: [P1.2] Implement LogSiteAnalyzer (Roslyn)

**Milestone:** M1 Log sites  
**Labels:** `analysis`, `roslyn`

### Context

Extend compilation walk (same pipeline as `MethodCallAnalyzer`).

### Goal

Per project: `{Project}LogSites.json` merged at read time.

### Tasks

- Detect `Microsoft.Extensions.Logging` extensions, Serilog `Log.*`, common patterns.
- Extract message template literals where possible.
- Wire into `AnalyzationClient` after method analysis.
- Merge reader similar to `MethodIndexReader`.

### Acceptance criteria

- [ ] Aimmy2 (or fixture) produces log sites for known logging calls.
- [ ] Re-analyze regenerates log index.

### Depends on

P1.1

---

## Issue: [P1.3] API endpoints for log sites

**Milestone:** M1 Log sites  
**Labels:** `api`, `server`

### Goal

- `GET /api/solutions/{folder}/methods/{methodHash}/logsites`
- `GET /api/solutions/{folder}/logsites/search?text=`

### Acceptance criteria

- [ ] Cached merge of per-project log JSON.
- [ ] Search returns `logSiteId`, `methodHash`, line, template snippet.

### Depends on

P1.2

---

# Phase 2 — Annotations

## Issue: [P2.1] Annotation storage model (SQLite or JSON)

**Milestone:** M2 Annotations  
**Labels:** `schema`, `storage`

### Goal

Persist team notes keyed by `methodHash`, `typeHash`, or `logSiteId` under `repository/{Solution}/`.

### Tasks

- Choose storage (recommend SQLite for query; JSON for simplicity).
- CRUD service in `ProjectExploration`.

### Acceptance criteria

- [ ] Create/read/update/delete by anchor.
- [ ] Survives server restart.

### Depends on

None.

---

## Issue: [P2.2] Annotation REST API

**Milestone:** M2 Annotations  
**Labels:** `api`, `server`

### Goal

`GET/POST/PATCH/DELETE /api/solutions/{folder}/annotations`

### Acceptance criteria

- [ ] Filter by `anchorKind` + `anchorHash`.
- [ ] Validation and error responses documented.

### Depends on

P2.1

---

## Issue: [P2.3] (Optional) Show annotations on method call graph cards

**Milestone:** M2 Annotations  
**Labels:** `frontend`

### Depends on

P2.2, existing `MethodCallGraphPanel.tsx`

---

# Phase 3 — Incident parsing (C# library)

## Issue: [P3.1] Create ProjectExploration.Incidents library

**Milestone:** M3 Incident parse  
**Labels:** `incidents`, `library`

### Goal

Parse pasted production text → `Incident` { exceptions, stackFrames, logLines, correlationIds, rawText }.

### Tasks

- New project referenced by server and future MCP.
- Parsers: .NET stack traces, JSON log lines (Serilog/ASP.NET common shapes).
- Tests with redacted samples in `testdata/incidents/`.

### Acceptance criteria

- [ ] ≥3 real-world samples parse without manual editing.
- [ ] Unknown formats degrade to `rawText` + partial extraction.

### Depends on

P0.2

---

## Issue: [P3.2] Stack frame resolver → methodHash

**Milestone:** M3 Incident parse  
**Labels:** `incidents`, `analysis`

### Goal

`IStackFrameResolver.Resolve(file, line, methodName?)` → `(methodHash, confidence)`.

### Tasks

- Match file path + line against method index `bodySpan`.
- Fallback: method name match within file.

### Acceptance criteria

- [ ] Document PDB/Release limitations.
- [ ] Unit tests with fixture index.

### Depends on

P3.1, existing method index

---

# Phase 4 — Anchoring

## Issue: [P4.1] Log line matcher (template + fuzzy)

**Milestone:** M4 Anchoring  
**Labels:** `incidents`, `retrieval`

### Goal

Match incident log lines to `LogSite` entries; output `LogMatch` with score.

### Depends on

P1.2, P3.1

---

## Issue: [P4.2] IncidentAnchorService (combine seeds)

**Milestone:** M4 Anchoring  
**Labels:** `incidents`, `library`

### Goal

Merge stack resolution + log matches → ranked `Anchor[]` (deduped).

### Acceptance criteria

- [ ] Single public API used by evidence pack builder later.

### Depends on

P3.2, P4.1

---

# Phase 5 — Graph expansion

## Issue: [P5.1] Bounded call/type subgraph builder

**Milestone:** M5 Graph expansion  
**Labels:** `graph`, `library`

### Goal

From anchors: BFS on call graph (callers/callees) + optional type edges; caps `maxDepth`, `maxMethods`.

### Tasks

- Reuse `MethodIndexReader`, relations map for types.
- Deterministic ordering for stable agent prompts.

### Depends on

P4.2

---

## Issue: [P5.2] Subgraph snippet enricher (shards + logs + annotations)

**Milestone:** M5 Graph expansion  
**Labels:** `graph`, `library`

### Goal

Attach method bodies from shards, log sites, annotations; estimate token budget.

### Depends on

P5.1, P1.3, P2.2

---

# Phase 6 — Evidence pack

## Issue: [P6.1] EvidencePack JSON schema v1

**Milestone:** M6 Evidence pack  
**Labels:** `schema`, `agent`, `docs`

### Goal

Versioned DTO + example `docs/examples/evidence-pack.json`.

### Depends on

P5.2

---

## Issue: [P6.2] EvidencePackBuilder service

**Milestone:** M6 Evidence pack  
**Labels:** `agent`, `library`

### Goal

`BuildAsync(solutionFolder, incident, options)` → `EvidencePack`.

### Depends on

P6.1

---

## Issue: [P6.3] POST /api/solutions/{folder}/investigate (no LLM)

**Milestone:** M6 Evidence pack  
**Labels:** `api`, `server`

### Goal

Request body: `{ "rawIncident": "..." }`; response: `EvidencePack`.

### Acceptance criteria

- [ ] Integration test.
- [ ] Log approximate JSON size / token estimate in response metadata.

### Depends on

P6.2

---

# Phase 7 — MCP server (C#)

## Issue: [P7.1] New project server/ProjectExplorer.Mcp

**Milestone:** M7 MCP  
**Labels:** `mcp`, `server`, `docs`

### Goal

Stdio or HTTP MCP host using Model Context Protocol C# SDK; config for solution folder + repository path.

### Acceptance criteria

- [ ] `docs/MCP_SETUP.md` with Cursor `mcp.json` example.
- [ ] Runs on .NET 9 only.

### Depends on

P6.2

---

## Issue: [P7.2] MCP tool: parse_incident

**Depends on:** P3.1, P7.1

---

## Issue: [P7.3] MCP tool: investigate_incident (evidence pack)

**Depends on:** P6.2, P7.1

---

## Issue: [P7.4] MCP tools: get_method_source, expand_call_graph, get_type_neighbors

**Depends on:** P7.1, ExplorerServer or shared libraries

---

## Issue: [P7.5] MCP tool: annotate (optional)

**Depends on:** P2.2, P7.1

---

# Phase 8 — C# agent

## Issue: [P8.1] ADR: agent stack (Microsoft.Extensions.AI vs Semantic Kernel)

**Milestone:** M8 C# Agent  
**Labels:** `agent`, `docs`

### Goal

`docs/adr/001-agent-stack.md` — C# only, API keys, structured output.

### Depends on

P6.1

---

## Issue: [P8.2] InvestigationAgent + InvestigateCli

**Milestone:** M8 C# Agent  
**Labels:** `agent`

### Goal

`InvestigateAsync(EvidencePack)` → `InvestigationResult` (ranked hypotheses, checks, citations).

### Tasks

- System prompt contract: must cite pack IDs; no false certainty.
- Console: `dotnet run --project tools/InvestigateCli -- pack.json`

### Depends on

P8.1, P6.2

---

## Issue: [P8.3] MCP tool: run_investigation (full pipeline)

**Milestone:** M8 C# Agent  
**Labels:** `mcp`, `agent`

### Goal

Raw incident → pack → agent → structured result; log token usage per stage.

### Depends on

P7.3, P8.2

---

## Issue: [P8.4] Commit skew warnings in pack and agent prompt

**Milestone:** M8 C# Agent  
**Labels:** `agent`, `reliability`

### Depends on

P0.1, P8.2

---

# Phase 9 — Vectors (optional)

## Issue: [P9.1] IEmbeddingGenerator abstraction (C#)

**Labels:** `retrieval`, `vector`

---

## Issue: [P9.2] Vector store + index-embeddings CLI

**Labels:** `retrieval`, `vector`

---

## Issue: [P9.3] Hybrid anchoring (template + vector seeds)

**Labels:** `retrieval`, `incidents`

**Depends on:** P4.2, P9.2

---

# Phase 10 — Hardening

## Issue: [P10.1] GitHub Actions: build, test, analyze fixture

**Labels:** `testing`, `ci`

---

## Issue: [P10.2] MCP setup guide for Claude Code / Cursor

**Labels:** `docs`, `mcp`

---

## Issue: [P10.3] Incident redaction before LLM

**Labels:** `security`, `agent`

---

## Issue: [P10.4] Investigation metrics (pack size, latency)

**Labels:** `dx`, `observability`

---

# Optional polish (existing product)

## Issue: [UX] Method call graph pan/zoom and fit-to-view

**Labels:** `frontend`  
**Context:** `MethodCallGraphPanel` grows horizontally; large traversals need navigation.

---

## Issue: [UX] CLI arguments for console analyzer (sln path, repository dir)

**Labels:** `dx`, `analysis`  
**Context:** `Program.cs` hard-coded paths.

---

## Issue: [Analysis] Extend type graph to records, structs, enums

**Labels:** `analysis`  
**Context:** `ClassDeclarationSyntax` only today.

---

## Suggested issue creation order (first 10 on GitHub)

1. P0.1 manifest  
2. P0.2 tests  
3. P0.3 docs/paths  
4. P1.1 LogSite schema  
5. P1.2 LogSiteAnalyzer  
6. P1.3 log API  
7. P3.1 Incidents library  
8. P3.2 stack resolver  
9. P6.1 EvidencePack schema (can parallel after P5)  
10. P7.1 MCP project  

Then P4 → P5 → P6.2 → P6.3 → P8 chain.
