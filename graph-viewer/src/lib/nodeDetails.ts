import type { GraphData, NodeStore, NodeType, TreeNode } from '../types/treeNode'

export function formatNodeType(type?: NodeType | number): string {
  if (type === undefined) return '—'
  if (typeof type === 'string') return type
  switch (type) {
    case 0:
      return 'None'
    case 1:
      return 'Tree'
    case 2:
      return 'Leave'
    default:
      return String(type)
  }
}

export function labelForHash(hash: string, store: NodeStore | null): string {
  const meta = store?.[hash]
  if (meta?.Name) {
    return meta.NameSpace ? `${meta.Name} (${meta.NameSpace})` : meta.Name
  }
  return hash.slice(0, 12) + (hash.length > 12 ? '…' : '')
}

export function shortLabelForHash(hash: string, store: NodeStore | null): string {
  return store?.[hash]?.Name ?? hash.slice(0, 10) + '…'
}

export function getGraphNeighbors(
  nodeId: string,
  graph: GraphData,
): { parents: string[]; children: string[] } {
  const parents: string[] = []
  const children: string[] = []

  for (const link of graph.links) {
    const source =
      typeof link.source === 'object'
        ? (link.source as { id: string }).id
        : link.source
    const target =
      typeof link.target === 'object'
        ? (link.target as { id: string }).id
        : link.target

    if (target === nodeId) parents.push(source)
    if (source === nodeId) children.push(target)
  }

  return {
    parents: [...new Set(parents)],
    children: [...new Set(children)],
  }
}

export function projectsContainingHash(
  projectsIndex: Record<string, string[]> | null,
  hash: string,
): string[] {
  if (!projectsIndex) return []
  return Object.entries(projectsIndex)
    .filter(([, hashes]) => hashes.includes(hash))
    .map(([name]) => name)
}

export function resolveTreeNode(
  hash: string,
  store: NodeStore | null,
): TreeNode | null {
  return store?.[hash] ?? null
}
