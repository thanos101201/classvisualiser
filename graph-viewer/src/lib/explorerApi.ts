/// <reference types="vite/client" />

import type {
  NodeStore,
  ProjectsNodeIndex,
  RelationsMap,
  TreeNode,
} from '../types/treeNode'
import type { SolutionBundle, SolutionBundleManifest } from './solutionBundle'

/** Empty string = same origin (use Vite proxy to ExplorerServer in dev). */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(
  /\/$/,
  '',
)

type ApiManifest = {
  solutionName: string
  folder: string
  relationsFile: string
  slnFile: string
  nodeFiles: string[]
}

type ApiBundleResponse = {
  manifest: ApiManifest
  relations: RelationsMap
  projectsIndex: ProjectsNodeIndex
  nodeStore: NodeStore
}

function toManifest(m: ApiManifest): SolutionBundleManifest {
  return {
    solutionName: m.solutionName,
    folder: m.folder,
    relationsFile: m.relationsFile,
    slnFile: m.slnFile,
    nodeFiles: m.nodeFiles,
  }
}

export async function apiHealthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/solutions`)
    return res.ok
  } catch {
    return false
  }
}

export async function listSolutionsFromApi(): Promise<SolutionBundleManifest[]> {
  const res = await fetch(`${API_BASE}/api/solutions`)
  if (!res.ok) {
    throw new Error(`API /api/solutions failed (${res.status})`)
  }
  const data = (await res.json()) as ApiManifest[]
  return data.map(toManifest)
}

export async function loadBundleFromApi(
  folder: string,
): Promise<SolutionBundle> {
  const res = await fetch(`${API_BASE}/api/solutions/${encodeURIComponent(folder)}/bundle`)
  if (!res.ok) {
    throw new Error(`API bundle load failed (${res.status})`)
  }
  const data = (await res.json()) as ApiBundleResponse
  return {
    manifest: toManifest(data.manifest),
    relations: data.relations,
    projectsIndex: data.projectsIndex,
    nodeStore: data.nodeStore,
  }
}

export async function fetchNodeFromApi(
  folder: string,
  nodeHash: string,
): Promise<TreeNode | null> {
  const res = await fetch(
    `${API_BASE}/api/solutions/${encodeURIComponent(folder)}/nodes/${encodeURIComponent(nodeHash)}`,
  )
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`API node load failed (${res.status})`)
  }
  return (await res.json()) as TreeNode
}
