import { useEffect, useState } from 'react'
import { fetchTypeMethods } from '../lib/explorerApi'
import {
  formatNodeType,
  getGraphNeighbors,
  labelForHash,
  projectsContainingHash,
  resolveTreeNode,
  shortLabelForHash,
} from '../lib/nodeDetails'
import type { MethodMetadata } from '../types/method'
import type {
  GraphData,
  GraphNode,
  NodeStore,
  ProjectsNodeIndex,
} from '../types/treeNode'

type Props = {
  selected: GraphNode
  nodeStore: NodeStore | null
  graphData: GraphData
  projectsIndex: ProjectsNodeIndex | null
  solutionFolder: string
  onNavigate: (hash: string) => void
  onMethodSelect: (methodHash: string) => void
  onClose: () => void
}

function HashLinkList({
  hashes,
  nodeStore,
  onNavigate,
  empty,
}: {
  hashes: string[]
  nodeStore: NodeStore | null
  onNavigate: (hash: string) => void
  empty: string
}) {
  if (!hashes.length) {
    return <p className="detail-empty">{empty}</p>
  }

  return (
    <ul className="hash-link-list">
      {hashes.map((hash) => (
        <li key={hash}>
          <button
            type="button"
            className="hash-link"
            onClick={() => onNavigate(hash)}
            title={hash}
          >
            <span className="hash-link-name">
              {shortLabelForHash(hash, nodeStore)}
            </span>
            <span className="hash-link-id mono">{hash.slice(0, 10)}…</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function NodeDetailPanel({
  selected,
  nodeStore,
  graphData,
  projectsIndex,
  solutionFolder,
  onNavigate,
  onMethodSelect,
  onClose,
}: Props) {
  const [methods, setMethods] = useState<MethodMetadata[]>([])
  const [methodsError, setMethodsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchTypeMethods(solutionFolder, selected.id)
        if (!cancelled) {
          setMethods(list)
          setMethodsError(null)
        }
      } catch {
        if (!cancelled) {
          setMethods([])
          setMethodsError('Methods unavailable (re-run analyzer + API).')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [solutionFolder, selected.id])

  const meta = resolveTreeNode(selected.id, nodeStore)
  const graphNeighbors = getGraphNeighbors(selected.id, graphData)

  const parentHashes = meta?.Parents?.length
    ? meta.Parents
    : graphNeighbors.parents
  const childHashes = meta?.Children?.length
    ? meta.Children
    : graphNeighbors.children

  const projects = projectsContainingHash(projectsIndex, selected.id)
  const displayName = meta?.Name ?? selected.label
  const nameSpace = meta?.NameSpace ?? selected.nameSpace
  const filePaths = meta?.FilePaths?.length
    ? meta.FilePaths
    : selected.filePaths

  return (
    <>
      <button
        type="button"
        className="close-btn"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>

      <h2>{displayName}</h2>
      {nameSpace && <p className="detail-namespace mono">{nameSpace}</p>}

      <dl className="detail-grid">
        <dt>Type</dt>
        <dd>{formatNodeType(meta?.Type ?? selected.type)}</dd>

        <dt>HashName</dt>
        <dd className="mono">{meta?.HashName ?? selected.id}</dd>

        {meta?.ID && (
          <>
            <dt>ID</dt>
            <dd className="mono">{meta.ID}</dd>
          </>
        )}

        {projects.length > 0 && (
          <>
            <dt>Project</dt>
            <dd>{projects.join(', ')}</dd>
          </>
        )}

        <dt>In graph</dt>
        <dd>
          {childHashes.length} child edge{childHashes.length === 1 ? '' : 's'},{' '}
          {parentHashes.length} parent edge
          {parentHashes.length === 1 ? '' : 's'}
        </dd>
      </dl>

      <section className="detail-section">
        <h3>Parents</h3>
        <p className="detail-hint">Base types / interfaces (click to jump)</p>
        <HashLinkList
          hashes={parentHashes}
          nodeStore={nodeStore}
          onNavigate={onNavigate}
          empty="No parent relations in this graph."
        />
      </section>

      <section className="detail-section">
        <h3>Children</h3>
        <p className="detail-hint">Derived / implementing types</p>
        <HashLinkList
          hashes={childHashes}
          nodeStore={nodeStore}
          onNavigate={onNavigate}
          empty="No child relations in this graph."
        />
      </section>

      <section className="detail-section">
        <h3>Methods</h3>
        <p className="detail-hint">Open method source (loaded from disk on click)</p>
        {methodsError && <p className="detail-empty">{methodsError}</p>}
        {!methodsError && methods.length === 0 && (
          <p className="detail-empty">No methods indexed for this type.</p>
        )}
        <ul className="hash-link-list">
          {methods.map((m) => (
            <li key={m.methodHash}>
              <button
                type="button"
                className="hash-link"
                onClick={() => onMethodSelect(m.methodHash)}
              >
                <span className="hash-link-name">{m.name}</span>
                <span className="hash-link-id mono">
                  L{m.bodySpan.startLine}–{m.bodySpan.endLine}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {filePaths && filePaths.length > 0 && (
        <section className="detail-section">
          <h3>Source files</h3>
          <ul className="files">
            {filePaths.map((path) => (
              <li key={path} className="mono">
                {path}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!meta && (
        <p className="hint">
          No entry in <code>*Nodes.json</code> for this hash. Labels and paths
          are limited to what appears in the relations graph.
        </p>
      )}

      {meta && (
        <section className="detail-section detail-raw">
          <h3>Full name</h3>
          <p className="mono">{labelForHash(selected.id, nodeStore)}</p>
        </section>
      )}
    </>
  )
}
