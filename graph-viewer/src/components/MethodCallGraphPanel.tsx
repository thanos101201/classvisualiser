import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  fetchMethodMetadata,
  fetchSourceSnippet,
} from '../lib/explorerApi'
import {
  estimateCardHeight,
  METHOD_CARD_WIDTH,
  placeChildNode,
  type LayoutNode,
} from '../lib/methodGraphLayout'
import type { MethodCallSiteRef, MethodMetadata } from '../types/method'

type MethodGraphNode = LayoutNode & {
  method: MethodMetadata
  lines: string[]
  startLine: number
}

export type MethodGraphEdge = {
  id: string
  fromMethodHash: string
  toMethodHash: string
  fromLine: number
}

type EdgePath = {
  id: string
  d: string
}

type Props = {
  solutionFolder: string
  rootMethodHash: string
  onClose: () => void
}

function callsOnLine(calls: MethodCallSiteRef[], line: number): MethodCallSiteRef[] {
  return calls.filter(
    (c) => line >= c.span.startLine && line <= c.span.endLine,
  )
}

function lineAnchorKey(methodHash: string, line: number) {
  return `${methodHash}:${line}`
}

export function MethodCallGraphPanel({
  solutionFolder,
  rootMethodHash,
  onClose,
}: Props) {
  const [nodes, setNodes] = useState<MethodGraphNode[]>([])
  const [edges, setEdges] = useState<MethodGraphEdge[]>([])
  const [edgePaths, setEdgePaths] = useState<EdgePath[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const lineRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const loadMethodNode = useCallback(
    async (methodHash: string, layout: LayoutNode): Promise<MethodGraphNode> => {
      const method = await fetchMethodMetadata(solutionFolder, methodHash)
      const snippet = await fetchSourceSnippet(
        method.filePath,
        method.bodySpan.startLine,
        method.bodySpan.endLine,
      )
      return {
        ...layout,
        method,
        lines: snippet.lines,
        startLine: snippet.startLine,
        lineCount: snippet.lines.length,
      }
    },
    [solutionFolder],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setNodes([])
      setEdges([])
      setLoading(true)
      setError(null)
      try {
        const root = await loadMethodNode(rootMethodHash, {
          methodHash: rootMethodHash,
          x: 24,
          y: 24,
          depth: 0,
          lineCount: 1,
        })
        if (!cancelled) setNodes([root])
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load method')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [rootMethodHash, loadMethodNode])

  const navigateCall = useCallback(
    async (from: MethodGraphNode, absoluteLine: number) => {
      const matches = callsOnLine(from.method.calls, absoluteLine).filter(
        (c) => c.calleeMethodHash,
      )
      const call =
        matches.find((c) => c.span.startLine === absoluteLine) ?? matches[0]
      if (!call?.calleeMethodHash) return

      const toHash = call.calleeMethodHash
      const edgeId = `${from.methodHash}:${absoluteLine}->${toHash}`

      let layoutForNew: LayoutNode | null = null

      setEdges((prev) => {
        if (prev.some((e) => e.id === edgeId)) return prev
        const siblingIndex = prev.filter(
          (e) => e.fromMethodHash === from.methodHash,
        ).length
        layoutForNew = {
          methodHash: toHash,
          ...placeChildNode(from, siblingIndex),
          lineCount: 1,
        }
        return [
          ...prev,
          {
            id: edgeId,
            fromMethodHash: from.methodHash,
            toMethodHash: toHash,
            fromLine: absoluteLine,
          },
        ]
      })

      const alreadyHasNode = nodes.some((n) => n.methodHash === toHash)
      if (!alreadyHasNode && layoutForNew) {
        setLoading(true)
        try {
          const loaded = await loadMethodNode(toHash, layoutForNew)
          setNodes((prev) =>
            prev.some((n) => n.methodHash === toHash) ? prev : [...prev, loaded],
          )
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to load callee')
          return
        } finally {
          setLoading(false)
        }
      }
    },
    [loadMethodNode, nodes],
  )

  const updateEdgePaths = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const canvasRect = canvas.getBoundingClientRect()
    const paths: EdgePath[] = []

    for (const edge of edges) {
      const fromLineEl = lineRefs.current.get(
        lineAnchorKey(edge.fromMethodHash, edge.fromLine),
      )
      const toCard = cardRefs.current.get(edge.toMethodHash)
      if (!fromLineEl || !toCard) continue

      const fromRect = fromLineEl.getBoundingClientRect()
      const toRect = toCard.getBoundingClientRect()

      const x1 = fromRect.right - canvasRect.left + canvas.scrollLeft
      const y1 = fromRect.top + fromRect.height / 2 - canvasRect.top + canvas.scrollTop
      const x2 = toRect.left - canvasRect.left + canvas.scrollLeft
      const y2 = toRect.top + 28 - canvasRect.top + canvas.scrollTop

      const midX = (x1 + x2) / 2
      const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
      paths.push({ id: edge.id, d })
    }

    setEdgePaths(paths)
  }, [edges])

  useLayoutEffect(() => {
    updateEdgePaths()
  }, [nodes, edges, updateEdgePaths])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onScroll = () => updateEdgePaths()
    window.addEventListener('resize', onScroll)
    canvas.addEventListener('scroll', onScroll)
    return () => {
      window.removeEventListener('resize', onScroll)
      canvas.removeEventListener('scroll', onScroll)
    }
  }, [updateEdgePaths])

  const canvasWidth =
    nodes.length === 0
      ? 400
      : Math.max(...nodes.map((n) => n.x + METHOD_CARD_WIDTH)) + 80
  const canvasHeight =
    nodes.length === 0
      ? 300
      : Math.max(
          ...nodes.map((n) => n.y + estimateCardHeight(n.lines.length)),
        ) + 80

  return (
    <div className="method-graph-panel">
      <div className="method-graph-toolbar">
        <button type="button" className="back-btn" onClick={onClose}>
          ← Type details
        </button>
        <span className="method-graph-title">Method call graph</span>
        {loading && <span className="method-graph-status">Loading…</span>}
        <button
          type="button"
          className="close-btn method-graph-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {error && <p className="search-feedback method-graph-error">{error}</p>}

      <div
        ref={canvasRef}
        className="method-graph-canvas"
        style={{ width: '100%', height: '100%' }}
      >
        <div
          className="method-graph-world"
          style={{ width: canvasWidth, height: canvasHeight }}
        >
          <svg
            className="method-graph-edges"
            width={canvasWidth}
            height={canvasHeight}
            aria-hidden
          >
            {edgePaths.map((p) => (
              <g key={p.id}>
                <path d={p.d} className="method-edge-path" />
                <path d={p.d} className="method-edge-path-glow" />
              </g>
            ))}
          </svg>

          <div className="method-graph-nodes">
          {nodes.map((node) => (
            <div
              key={node.methodHash}
              ref={(el) => {
                if (el) cardRefs.current.set(node.methodHash, el)
                else cardRefs.current.delete(node.methodHash)
              }}
              className="method-graph-card"
              style={{ left: node.x, top: node.y, width: METHOD_CARD_WIDTH }}
            >
              <div className="method-graph-card-header">
                <strong>{node.method.name}</strong>
                <span className="mono muted">
                  L{node.method.bodySpan.startLine}–{node.method.bodySpan.endLine}
                </span>
              </div>
              <pre className="method-code method-code-compact">
                {node.lines.map((text, index) => {
                  const lineNo = node.startLine + index
                  const lineCalls = callsOnLine(node.method.calls, lineNo)
                  const clickable = lineCalls.some((c) => c.calleeMethodHash)
                  const title = lineCalls
                    .map((c) => c.calleeDisplayName ?? c.calleeMethodHash)
                    .join(', ')

                  return (
                    <div
                      key={lineNo}
                      ref={(el) => {
                        const key = lineAnchorKey(node.methodHash, lineNo)
                        if (el) lineRefs.current.set(key, el)
                        else lineRefs.current.delete(key)
                      }}
                      className={`code-line ${clickable ? 'code-line-call' : ''} ${
                        edges.some(
                          (e) =>
                            e.fromMethodHash === node.methodHash &&
                            e.fromLine === lineNo,
                        )
                          ? 'code-line-edge-active'
                          : ''
                      }`}
                      onClick={() => clickable && navigateCall(node, lineNo)}
                      title={clickable ? title : undefined}
                      role={clickable ? 'button' : undefined}
                    >
                      <span className="line-no">{lineNo}</span>
                      <span className="line-text">{text || ' '}</span>
                    </div>
                  )
                })}
              </pre>
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  )
}
