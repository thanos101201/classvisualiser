import type { GraphNode } from '../types/treeNode'

export type HashSearchResult =
  | { status: 'empty' }
  | { status: 'found'; node: GraphNode }
  | { status: 'not_found' }
  | { status: 'ambiguous'; count: number }

/** Resolve a hash query against nodes currently in the graph. */
export function findNodeByHash(
  nodes: GraphNode[],
  query: string,
): HashSearchResult {
  const q = query.trim().toLowerCase()
  if (!q) return { status: 'empty' }

  const exact = nodes.find((n) => n.id.toLowerCase() === q)
  if (exact) return { status: 'found', node: exact }

  const prefix = nodes.filter((n) => n.id.toLowerCase().startsWith(q))
  if (prefix.length === 1) return { status: 'found', node: prefix[0] }

  if (prefix.length > 1) {
    return { status: 'ambiguous', count: prefix.length }
  }

  const partial = nodes.filter((n) => n.id.toLowerCase().includes(q))
  if (partial.length === 1) return { status: 'found', node: partial[0] }
  if (partial.length > 1) return { status: 'ambiguous', count: partial.length }

  return { status: 'not_found' }
}
