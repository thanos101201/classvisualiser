import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { GraphViewer3D } from './components/GraphViewer3D'
import { NodeDetailPanel } from './components/NodeDetailPanel'
import { buildGraphData, listProjects } from './lib/buildGraphData'
import { readGraphFromJsonFile } from './lib/loadGraphFromFile'
import { loadSolutionFromBrowsedFiles } from './lib/loadSolutionFromFiles'
import { findNodeByHash } from './lib/findNodeByHash'
import {
  listSolutionBundles,
  loadSolutionBundle,
  type SolutionBundleManifest,
} from './lib/solutionBundle'
import type {
  GraphNode,
  NodeStore,
  ProjectsNodeIndex,
  RelationsMap,
} from './types/treeNode'
import './App.css'

const REPO_BASE = `${import.meta.env.BASE_URL}repository`.replace(/\/$/, '')

function App() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectsIndex, setProjectsIndex] = useState<ProjectsNodeIndex | null>(
    null,
  )
  const [relations, setRelations] = useState<RelationsMap | null>(null)
  const [nodeStore, setNodeStore] = useState<NodeStore | null>(null)
  const [bundleLabel, setBundleLabel] = useState<string>('')
  const [project, setProject] = useState<string>('')
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [hashQuery, setHashQuery] = useState('')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null)
  const [showOrphanNodes, setShowOrphanNodes] = useState(false)
  const [solutionBundles, setSolutionBundles] = useState<
    SolutionBundleManifest[]
  >([])
  const [activeBundleFolder, setActiveBundleFolder] = useState<string>('')
  const [graphSource, setGraphSource] = useState<'repository' | 'local'>(
    'repository',
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clearSelection = useCallback(() => {
    setSelected(null)
    setHighlightId(null)
    setSearchFeedback(null)
  }, [])

  const applySolution = useCallback(
    (
      data: {
        relations: RelationsMap
        projectsIndex: ProjectsNodeIndex
        nodeStore: NodeStore
        label: string
      },
      source: 'repository' | 'local',
    ) => {
      setRelations(data.relations)
      setProjectsIndex(data.projectsIndex)
      setNodeStore(data.nodeStore)
      setBundleLabel(data.label)
      setGraphSource(source)
      const projects = listProjects(data.projectsIndex)
      setProject((prev) =>
        prev && projects.includes(prev) ? prev : (projects[0] ?? ''),
      )
      clearSelection()
    },
    [clearSelection],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const bundles = await listSolutionBundles(REPO_BASE)
        if (cancelled) return

        setSolutionBundles(bundles)

        if (!bundles.length) {
          setError(
            'No solution folder in repository/ (expected e.g. Aimmy2/Aimmy2.json + Aimmy2.sln.json). Use Browse to load files.',
          )
          return
        }

        const initial = bundles[0]
        setActiveBundleFolder(initial.folder)
        const bundle = await loadSolutionBundle(REPO_BASE, initial)
        if (cancelled) return

        applySolution(
          {
            relations: bundle.relations,
            projectsIndex: bundle.projectsIndex,
            nodeStore: bundle.nodeStore,
            label: `${initial.folder}/`,
          },
          'repository',
        )
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load graph data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [applySolution])

  const loadRepositoryBundle = useCallback(
    async (folder: string) => {
      const manifest = solutionBundles.find((b) => b.folder === folder)
      if (!manifest) return

      setLoading(true)
      setError(null)
      setActiveBundleFolder(folder)
      try {
        const bundle = await loadSolutionBundle(REPO_BASE, manifest)
        applySolution(
          {
            relations: bundle.relations,
            projectsIndex: bundle.projectsIndex,
            nodeStore: bundle.nodeStore,
            label: `${folder}/`,
          },
          'repository',
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load solution')
      } finally {
        setLoading(false)
      }
    },
    [applySolution, solutionBundles],
  )

  const graphData = useMemo(() => {
    if (!relations) {
      return { nodes: [], links: [] }
    }
    const hashes =
      projectsIndex && project ? (projectsIndex[project] ?? []) : []
    return buildGraphData(relations, hashes, nodeStore, {
      includeOrphanProjectNodes: showOrphanNodes,
    })
  }, [projectsIndex, relations, project, nodeStore, showOrphanNodes])

  const projects = useMemo(
    () => (projectsIndex ? listProjects(projectsIndex) : []),
    [projectsIndex],
  )

  const focusNode = useCallback((hash: string) => {
    const graphNode = graphData.nodes.find((n) => n.id === hash)
    if (graphNode) {
      setSelected(graphNode)
      setHighlightId(hash)
      setHashQuery(hash)
      setSearchFeedback(null)
      return
    }
    const meta = nodeStore?.[hash]
    setSelected({
      id: hash,
      label: meta?.Name ?? hash.slice(0, 8),
      nameSpace: meta?.NameSpace,
      filePaths: meta?.FilePaths,
      type: meta?.Type,
      val: 1,
    })
    setHighlightId(hash)
    setHashQuery(hash)
  }, [graphData.nodes, nodeStore])

  const handleNodeClick = useCallback(
    (node: GraphNode | null) => {
      if (!node) {
        setSelected(null)
        setHighlightId(null)
        return
      }
      focusNode(node.id)
    },
    [focusNode],
  )

  const handleHashSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      const result = findNodeByHash(graphData.nodes, hashQuery)
      switch (result.status) {
        case 'empty':
          setHighlightId(null)
          setSearchFeedback(null)
          break
        case 'found':
          focusNode(result.node.id)
          break
        case 'not_found':
          setHighlightId(null)
          setSearchFeedback('No node with that hash in this project.')
          break
        case 'ambiguous':
          setHighlightId(null)
          setSearchFeedback(
            `${result.count} nodes match — enter a longer or full hash.`,
          )
          break
      }
    },
    [graphData.nodes, hashQuery, focusNode],
  )

  return (
    <div className="app-shell">
      <header className="toolbar">
        <div className="toolbar-title">
          <h1>ProjectExplorer</h1>
          <p className="subtitle">
            Solution bundle: relations + project index + node metadata
          </p>
        </div>
        <label className="project-picker graph-file-picker">
          Solution
          <div className="graph-file-row">
            <select
              value={
                graphSource === 'repository' ? activeBundleFolder : ''
              }
              disabled={!solutionBundles.length || graphSource === 'local'}
              onChange={(e) => {
                const folder = e.target.value
                if (folder) loadRepositoryBundle(folder)
              }}
            >
              {solutionBundles.map((b) => (
                <option key={b.folder} value={b.folder}>
                  repository/{b.folder}/
                </option>
              ))}
            </select>
            <button
              type="button"
              className="browse-btn"
              title="Select Aimmy2.json, Aimmy2.sln.json, and *Nodes.json together"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse…
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              multiple
              hidden
              onChange={async (e) => {
                const picked = [...(e.target.files ?? [])]
                e.target.value = ''
                if (!picked.length) return

                setLoading(true)
                setError(null)
                try {
                  if (picked.length >= 2) {
                    const bundle = await loadSolutionFromBrowsedFiles(picked)
                    applySolution(
                      {
                        relations: bundle.relations,
                        projectsIndex: bundle.projectsIndex,
                        nodeStore: bundle.nodeStore,
                        label: bundle.manifest.solutionName,
                      },
                      'local',
                    )
                  } else {
                    const payload = await readGraphFromJsonFile(picked[0])
                    applySolution(
                      {
                        relations: payload.relations,
                        projectsIndex: {},
                        nodeStore: payload.nodeStore ?? {},
                        label: payload.fileName,
                      },
                      'local',
                    )
                  }
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : 'Could not read files',
                  )
                } finally {
                  setLoading(false)
                }
              }}
            />
          </div>
          {graphSource === 'local' && bundleLabel && (
            <span className="local-file-hint">Local: {bundleLabel}</span>
          )}
        </label>
        <label className="project-picker">
          Project
          <select
            value={project}
            disabled={!projects.length}
            onChange={(e) => {
              setProject(e.target.value)
              clearSelection()
            }}
          >
            {projects.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="orphan-toggle">
          <input
            type="checkbox"
            checked={showOrphanNodes}
            onChange={(e) => {
              setShowOrphanNodes(e.target.checked)
              clearSelection()
            }}
          />
          Show classes without edges
        </label>
        <form className="hash-search" onSubmit={handleHashSearch}>
          <label>
            Hash
            <input
              type="search"
              value={hashQuery}
              placeholder="HashName (full or prefix)"
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => {
                setHashQuery(e.target.value)
                if (searchFeedback) setSearchFeedback(null)
              }}
            />
          </label>
          <button type="submit">Find</button>
        </form>
        {searchFeedback && (
          <p className="search-feedback" role="status">
            {searchFeedback}
          </p>
        )}
        <div className="stats">
          {bundleLabel && <span className="graph-file">{bundleLabel}</span>}
          <span>{graphData.nodes.length} nodes</span>
          <span>{graphData.links.length} edges</span>
        </div>
      </header>

      <main className="main">
        {loading && <div className="overlay-msg">Loading repository JSON…</div>}
        {error && <div className="overlay-msg error">{error}</div>}
        {!loading && !error && (
          <GraphViewer3D
            data={graphData}
            selectedId={selected?.id ?? null}
            highlightId={highlightId}
            onNodeClick={handleNodeClick}
          />
        )}

        <aside className={`detail-panel ${selected ? 'open' : ''}`}>
          {selected ? (
            <NodeDetailPanel
              selected={selected}
              nodeStore={nodeStore}
              graphData={graphData}
              projectsIndex={projectsIndex}
              onNavigate={focusNode}
              onClose={() => {
                setSelected(null)
                setHighlightId(null)
              }}
            />
          ) : (
            <p className="hint panel-idle">
              Click a node for class details, parents, children, and source
              paths. Drag to orbit, scroll to zoom.
            </p>
          )}
        </aside>
      </main>
    </div>
  )
}

export default App
