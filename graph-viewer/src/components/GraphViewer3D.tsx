import { useCallback, useEffect, useRef } from 'react'
import ForceGraph3D, { type ForceGraphMethods } from 'react-force-graph-3d'
import type { GraphData, GraphNode } from '../types/treeNode'

type SimNode = GraphNode & { x?: number; y?: number; z?: number }

type Props = {
  data: GraphData
  onNodeClick: (node: GraphNode | null) => void
  selectedId: string | null
  highlightId: string | null
}

type ForceGraphWithData = ForceGraphMethods & {
  graphData(): { nodes: SimNode[]; links: unknown[] }
}

function simNodePosition(node: SimNode): { x: number; y: number; z: number } | null {
  const { x, y, z } = node
  if (
    x === undefined ||
    y === undefined ||
    z === undefined ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(z)
  ) {
    return null
  }
  return { x, y, z }
}

function focusNodeCamera(fg: ForceGraphMethods, nodeId: string): boolean {
  try {
    const nodes = (fg as ForceGraphWithData).graphData()?.nodes
    if (!nodes?.length) return false

    const simNode = nodes.find((n) => n.id === nodeId)
    if (!simNode) return false

    const pos = simNodePosition(simNode)
    if (!pos) return false

    const distance = 220
    const len = Math.hypot(pos.x, pos.y, pos.z) || 1
    const scale = 1 + distance / len

    fg.cameraPosition(
      {
        x: pos.x * scale,
        y: pos.y * scale,
        z: pos.z * scale,
      },
      { x: pos.x, y: pos.y, z: pos.z },
      800,
    )
    return true
  } catch {
    return false
  }
}

export function GraphViewer3D({
  data,
  onNodeClick,
  selectedId,
  highlightId,
}: Props) {
  const ref = useRef<ForceGraphMethods | undefined>(undefined)
  const selectedIdRef = useRef(selectedId)
  const highlightIdRef = useRef(highlightId)
  selectedIdRef.current = selectedId
  highlightIdRef.current = highlightId

  const focusTargetRef = useRef<string | null>(null)

  useEffect(() => {
    if (!highlightId) {
      focusTargetRef.current = null
      return
    }
    focusTargetRef.current = highlightId

    let attempts = 0
    const maxAttempts = 60

    const tryFocus = () => {
      const id = focusTargetRef.current
      const fg = ref.current
      if (!id || !fg) return

      if (focusNodeCamera(fg, id)) {
        focusTargetRef.current = null
        return
      }

      attempts += 1
      if (attempts < maxAttempts) {
        window.setTimeout(tryFocus, 100)
      }
    }

    tryFocus()
    return () => {
      focusTargetRef.current = null
    }
  }, [highlightId])

  useEffect(() => {
    const fg = ref.current as ForceGraphMethods & { refresh?: () => void }
    fg?.refresh?.()
  }, [highlightId, selectedId])

  const handleClick = useCallback(
    (node: object) => {
      const n = node as SimNode
      onNodeClick({
        id: n.id,
        label: n.label,
        nameSpace: n.nameSpace,
        type: n.type,
        filePaths: n.filePaths,
        val: n.val,
      })
    },
    [onNodeClick],
  )

  const nodeLabel = useCallback((n: object) => {
    const node = n as GraphNode
    const ns = node.nameSpace ? `\n${node.nameSpace}` : ''
    return `${node.label}${ns}`
  }, [])

  const nodeColor = useCallback((n: object) => {
    const node = n as GraphNode
    if (node.id === selectedIdRef.current) return '#fbbf24'
    if (node.id === highlightIdRef.current) return '#4ade80'
    return node.filePaths?.length ? '#38bdf8' : '#a78bfa'
  }, [])

  const linkColor = useCallback(() => 'rgba(148, 163, 184, 0.35)', [])
  const particleColor = useCallback(() => '#64748b', [])

  const handleBackgroundClick = useCallback(() => {
    onNodeClick(null)
  }, [onNodeClick])

  return (
    <ForceGraph3D
      ref={ref}
      graphData={data}
      backgroundColor="#0b0f17"
      nodeId="id"
      nodeLabel={nodeLabel}
      nodeVal="val"
      nodeColor={nodeColor}
      linkColor={linkColor}
      linkDirectionalParticles={1}
      linkDirectionalParticleWidth={2}
      linkDirectionalParticleColor={particleColor}
      onNodeClick={handleClick}
      onBackgroundClick={handleBackgroundClick}
      warmupTicks={40}
      cooldownTicks={0}
    />
  )
}
