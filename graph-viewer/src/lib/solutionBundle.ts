import {
  parseGraphJsonContent,
  parseNodeStore,
} from './buildGraphData'
import {
  apiHealthCheck,
  listSolutionsFromApi,
  loadBundleFromApi,
} from './explorerApi'
import type {
  NodeStore,
  ProjectsNodeIndex,
  RelationsMap,
} from '../types/treeNode'

/**
 * ProjectExplorer writes a solution folder under repository/{Solution}/:
 *
 * - {Solution}.json       — parent HashName → child HashName[] (hierarchy / edges)
 * - {Solution}.sln.json   — project name → HashName[] (membership index)
 * - {Project}Nodes.json   — HashName → TreeNode (class/interface metadata)
 *
 * The graph viewer joins them on HashName.
 */
export type SolutionBundleManifest = {
  solutionName: string
  /** Folder under repository/, e.g. "Aimmy2" */
  folder: string
  relationsFile: string
  slnFile: string
  nodeFiles: string[]
}

export type SolutionBundle = {
  manifest: SolutionBundleManifest
  relations: RelationsMap
  projectsIndex: ProjectsNodeIndex
  nodeStore: NodeStore
}

export function mergeNodeStores(stores: NodeStore[]): NodeStore {
  const merged: NodeStore = {}
  for (const store of stores) {
    Object.assign(merged, store)
  }
  return merged
}

export async function listSolutionBundles(
  repoBase: string,
): Promise<SolutionBundleManifest[]> {
  if (await apiHealthCheck()) {
    return listSolutionsFromApi()
  }

  try {
    const res = await fetch('/api/repository/solution-bundles')
    if (res.ok) {
      return (await res.json()) as SolutionBundleManifest[]
    }
  } catch {
    /* static file fallback */
  }

  const siteBase = repoBase.replace(/\/repository\/?$/i, '')
  const manifestRes = await fetch(`${siteBase}/solution-bundles.json`)
  if (manifestRes.ok) {
    return (await manifestRes.json()) as SolutionBundleManifest[]
  }

  return []
}

function bundleUrl(repoBase: string, folder: string, file: string): string {
  return `${repoBase}/${folder}/${file}`
}

export async function loadSolutionBundle(
  repoBase: string,
  manifest: SolutionBundleManifest,
): Promise<SolutionBundle> {
  if (await apiHealthCheck()) {
    return loadBundleFromApi(manifest.folder)
  }

  const [relationsRes, slnRes] = await Promise.all([
    fetch(bundleUrl(repoBase, manifest.folder, manifest.relationsFile)),
    fetch(bundleUrl(repoBase, manifest.folder, manifest.slnFile)),
  ])

  if (!relationsRes.ok) {
    throw new Error(
      `Failed to load ${manifest.relationsFile} (${relationsRes.status})`,
    )
  }
  if (!slnRes.ok) {
    throw new Error(`Failed to load ${manifest.slnFile} (${slnRes.status})`)
  }

  const relationsRaw = await relationsRes.json()
  const parsedRelations = parseGraphJsonContent(relationsRaw)
  if (parsedRelations.nodeStore && !Object.keys(parsedRelations.relations).length) {
    throw new Error(
      `${manifest.relationsFile} looks like a node store; expected a relations map.`,
    )
  }

  const projectsIndex = (await slnRes.json()) as ProjectsNodeIndex

  const nodeStores: NodeStore[] = []
  for (const nodeFile of manifest.nodeFiles) {
    const res = await fetch(bundleUrl(repoBase, manifest.folder, nodeFile))
    if (!res.ok) {
      console.warn(`Skipping missing node file: ${nodeFile}`)
      continue
    }
    const raw = await res.json()
    const store = parseNodeStore(raw)
    if (store) nodeStores.push(store)
  }

  const nodeStore = mergeNodeStores(nodeStores)

  return {
    manifest,
    relations: parsedRelations.relations,
    projectsIndex,
    nodeStore,
  }
}

/** Resolve metadata for a hash from the merged node store. */
export function getNodeMetadata(
  store: NodeStore,
  hash: string,
): NodeStore[string] | undefined {
  return store[hash]
}
