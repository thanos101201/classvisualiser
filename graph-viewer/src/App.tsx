import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { GraphViewer3D } from './components/GraphViewer3D'
import {
  buildGraphData,
  listProjects,
  loadProjectNodeStore,
  loadRepositoryBundle,
} from './lib/buildGraphData'
import { findNodeByHash } from './lib/findNodeByHash'
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
  const [graphFile, setGraphFile] = useState<string>('')
  const [project, setProject] = useState<string>('')
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [hashQuery, setHashQuery] = useState('')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null)
  const [showOrphanNodes, setShowOrphanNodes] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const bundle = await loadRepositoryBundle(REPO_BASE)
        if (cancelled) return
        setProjectsIndex(bundle.projectsIndex)
        setRelations(bundle.relations)
        setNodeStore(bundle.nodeStore)
        setGraphFile(bundle.graphFile)
        const projects = listProjects(bundle.projectsIndex)
        setProject(projects[0] ?? '')
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
  }, [])

  useEffect(() => {
    if (!project) return
    let cancelled = false
    ;(async () => {
      const store = await loadProjectNodeStore(REPO_BASE, project)
      if (!cancelled) {
        setNodeStore((prev) => store ?? prev)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [project])

  const graphData = useMemo(() => {
    if (!projectsIndex || !relations || !project) {
      return { nodes: [], links: [] }
    }
    const hashes = projectsIndex[project] ?? []
    return buildGraphData(relations, hashes, nodeStore, {
      includeOrphanProjectNodes: showOrphanNodes,
    })
  }, [projectsIndex, relations, project, nodeStore, showOrphanNodes])

  const projects = useMemo(
    () => (projectsIndex ? listProjects(projectsIndex) : []),
    [projectsIndex],
  )

  const handleNodeClick = useCallback((node: GraphNode | null) => {
    setSelected(node)
    setHighlightId(node?.id ?? null)
    if (node) setHashQuery(node.id)
  }, [])

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
          setHighlightId(result.node.id)
          setSelected(result.node)
          setSearchFeedback(null)
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
    [graphData.nodes, hashQuery],
  )

  return (
    <div className="app-shell">
      <header className="toolbar">
        <div className="toolbar-title">
          <h1>ProjectExplorer</h1>
          <p className="subtitle">3D type graph from repository JSON</p>
        </div>
        <label className="project-picker">
          Project
          <select
            value={project}
            disabled={!projects.length}
            onChange={(e) => {
              setProject(e.target.value)
              setSelected(null)
              setHighlightId(null)
              setSearchFeedback(null)
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
              setSelected(null)
              setHighlightId(null)
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
          {graphFile && <span className="graph-file">{graphFile}</span>}
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
            <>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                ×
              </button>
              <h2>{selected.label}</h2>
              {selected.nameSpace && (
                <p className="mono block">{selected.nameSpace}</p>
              )}
              <p className="mono block muted">{selected.id}</p>
              {selected.filePaths && selected.filePaths.length > 0 && (
                <div className="files">
                  <h3>Source</h3>
                  <ul>
                    {selected.filePaths.map((path) => (
                      <li key={path} className="mono">
                        {path}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!selected.nameSpace && (
                <p className="hint">
                  Class names appear when TreeNode metadata is exported to{' '}
                  <code>repository/{project}/nodes.json</code>.
                </p>
              )}
            </>
          ) : (
            <p className="hint panel-idle">
              Click a node to inspect it. Drag to orbit, scroll to zoom.
            </p>
          )}
        </aside>
      </main>
    </div>
  )
}

export default App
