import type {
  GraphData,
  GraphLink,
  GraphNode,
  NodeStore,
  ProjectsNodeIndex,
  RelationsMap,
  TreeNode,
} from '../types/treeNode'

function mergeNodeMeta(
  hash: string,
  store: NodeStore | null,
): Pick<GraphNode, 'label' | 'nameSpace' | 'type' | 'filePaths'> {
  const meta = store?.[hash]
  if (meta?.Name) {
    return {
      label: meta.Name,
      nameSpace: meta.NameSpace,
      type: meta.Type,
      filePaths: meta.FilePaths,
    }
  }
  return { label: hash.slice(0, 8) }
}

function isTreeNodeRecord(value: unknown): value is NodeStore {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const first = Object.values(value as Record<string, unknown>)[0]
  if (!first || typeof first !== 'object' || Array.isArray(first)) return false
  return 'HashName' in (first as TreeNode) || 'Name' in (first as TreeNode)
}

export function parseNodeStore(raw: unknown): NodeStore | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  if (isTreeNodeRecord(raw)) return raw as NodeStore
  return null
}

function isRelationsMap(raw: unknown): raw is RelationsMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  return Object.values(raw as Record<string, unknown>).every(
    (v) => Array.isArray(v) && v.every((item) => typeof item === 'string'),
  )
}

/** Parse a browsed JSON file: relations map (e.g. Aimmy2.json) or TreeNode store. */
export function parseGraphJsonContent(raw: unknown): {
  relations: RelationsMap
  nodeStore: NodeStore | null
} {
  const nodeStore = parseNodeStore(raw)
  if (nodeStore) {
    return { relations: {}, nodeStore }
  }
  if (!isRelationsMap(raw)) {
    throw new Error(
      'Unsupported JSON: expected parent→child hash map or TreeNode metadata object.',
    )
  }
  return { relations: raw, nodeStore: null }
}

export function relationsFromNodeStore(store: NodeStore): RelationsMap {
  const relations: RelationsMap = {}
  for (const node of Object.values(store)) {
    const parent = node.HashName
    if (!parent) continue
    const children = node.Children ?? []
    if (children.length) relations[parent] = [...children]
  }
  return relations
}

/** All hashes that appear as a parent key or child value in a relations file. */
export function collectRelationNodeIds(relations: RelationsMap): Set<string> {
  const ids = new Set<string>()
  for (const [parent, children] of Object.entries(relations)) {
    ids.add(parent)
    for (const child of children) ids.add(child)
  }
  return ids
}

export type BuildGraphOptions = {
  /**
   * When true, also show classes listed in ProjectsNodeIndex that have no
   * edge in the relations JSON (orphan nodes). Default false — graph matches
   * the relations file only.
   */
  includeOrphanProjectNodes?: boolean
}

export function buildGraphData(
  relations: RelationsMap,
  projectNodeHashes: string[],
  nodeStore: NodeStore | null,
  options: BuildGraphOptions = {},
): GraphData {
  const idSet = collectRelationNodeIds(relations)

  if (options.includeOrphanProjectNodes) {
    for (const hash of projectNodeHashes) idSet.add(hash)
  }

  const linkKey = (a: string, b: string) => `${a}\0${b}`
  const seenLinks = new Set<string>()
  const links: GraphLink[] = []

  for (const [parent, children] of Object.entries(relations)) {
    for (const child of children) {
      const key = linkKey(parent, child)
      if (seenLinks.has(key)) continue
      seenLinks.add(key)
      links.push({ source: parent, target: child })
    }
  }

  const childCount = new Map<string, number>()
  for (const link of links) {
    childCount.set(link.source, (childCount.get(link.source) ?? 0) + 1)
  }

  const nodes: GraphNode[] = [...idSet].map((id) => {
    const meta = mergeNodeMeta(id, nodeStore)
    const degree = childCount.get(id) ?? 0
    return {
      id,
      ...meta,
      val: 1 + Math.min(degree, 8),
    }
  })

  return { nodes, links }
}

export function listProjects(index: ProjectsNodeIndex): string[] {
  return Object.keys(index).sort((a, b) => a.localeCompare(b))
}

export async function listRepositoryGraphFiles(
  baseUrl: string,
): Promise<string[]> {
  try {
    const res = await fetch('/api/repository/graph-files')
    if (res.ok) {
      return (await res.json()) as string[]
    }
  } catch {
    /* preview build has no dev API */
  }

  const fallback = `${baseUrl}/Aimmy2.json`
  const probe = await fetch(fallback, { method: 'HEAD' })
  if (probe.ok) return ['Aimmy2.json']
  return []
}

function pickGraphFile(files: string[], project: string): string | null {
  if (!files.length) return null
  const byProject = files.find(
    (f) => f.replace(/\.json$/i, '') === project,
  )
  return byProject ?? files[0]
}

export async function loadProjectsIndex(
  baseUrl: string,
): Promise<ProjectsNodeIndex> {
  const indexRes = await fetch(`${baseUrl}/ProjectsNodeIndex.json`)
  if (!indexRes.ok) {
    throw new Error(
      `Failed to load ProjectsNodeIndex.json (${indexRes.status})`,
    )
  }
  return (await indexRes.json()) as ProjectsNodeIndex
}

export async function loadGraphRelations(
  baseUrl: string,
  graphFile: string,
): Promise<{ relations: RelationsMap; nodeStore: NodeStore | null }> {
  const relationsRes = await fetch(`${baseUrl}/${graphFile}`)
  if (!relationsRes.ok) {
    throw new Error(`Failed to load ${graphFile} (${relationsRes.status})`)
  }

  const relationsRaw = await relationsRes.json()
  const nodeStore = parseNodeStore(relationsRaw)
  const relations = nodeStore ? {} : (relationsRaw as RelationsMap)

  return { relations, nodeStore }
}

export async function loadProjectNodeStore(
  baseUrl: string,
  project: string,
): Promise<NodeStore | null> {
  try {
    const nodesRes = await fetch(`${baseUrl}/${project}/nodes.json`)
    if (nodesRes.ok) {
      return parseNodeStore(await nodesRes.json())
    }
  } catch {
    return null
  }
  return null
}

export async function loadRepositoryBundle(
  baseUrl: string,
  preferredProject?: string,
): Promise<{
  projectsIndex: ProjectsNodeIndex
  relations: RelationsMap
  nodeStore: NodeStore | null
  graphFile: string
}> {
  const projectsIndex = await loadProjectsIndex(baseUrl)
  const projects = listProjects(projectsIndex)
  const project = preferredProject ?? projects[0] ?? ''

  const graphFiles = await listRepositoryGraphFiles(baseUrl)
  const graphFile = pickGraphFile(graphFiles, project)
  if (!graphFile) {
    throw new Error(
      'No relations JSON found in repository/ (expected e.g. Aimmy2.json)',
    )
  }

  const { relations, nodeStore: relationsAsNodes } =
    await loadGraphRelations(baseUrl, graphFile)
  const optionalNodes = project
    ? await loadProjectNodeStore(baseUrl, project)
    : null

  return {
    projectsIndex,
    relations,
    nodeStore: optionalNodes ?? relationsAsNodes,
    graphFile,
  }
}
