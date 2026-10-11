import {
  parseGraphJsonContent,
  relationsFromNodeStore,
} from './buildGraphData'
import type { NodeStore, RelationsMap } from '../types/treeNode'

export async function readGraphFromJsonFile(file: File): Promise<{
  relations: RelationsMap
  nodeStore: NodeStore | null
  fileName: string
}> {
  const text = await file.text()
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error(`"${file.name}" is not valid JSON.`)
  }

  const parsed = parseGraphJsonContent(raw)
  let relations = parsed.relations
  const nodeStore = parsed.nodeStore

  if (nodeStore && Object.keys(relations).length === 0) {
    relations = relationsFromNodeStore(nodeStore)
  }

  if (Object.keys(relations).length === 0 && !nodeStore) {
    throw new Error(`"${file.name}" contains no graph edges.`)
  }

  return { relations, nodeStore, fileName: file.name }
}
