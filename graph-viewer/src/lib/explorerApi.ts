/// <reference types="vite/client" />

import type {
  NodeStore,
  ProjectsNodeIndex,
  RelationsMap,
  TreeNode,
} from '../types/treeNode'
import type { MethodMetadata, SourceSnippet } from '../types/method'
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
  methodIndexFiles?: string[]
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
    methodIndexFiles: m.methodIndexFiles ?? [],
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

export async function fetchTypeMethods(
  folder: string,
  typeHash: string,
): Promise<MethodMetadata[]> {
  const res = await fetch(
    `${API_BASE}/api/solutions/${encodeURIComponent(folder)}/types/${encodeURIComponent(typeHash)}/methods`,
  )
  if (!res.ok) {
    throw new Error(`API methods list failed (${res.status})`)
  }
  return (await res.json()) as MethodMetadata[]
}

export async function fetchMethodMetadata(
  folder: string,
  methodHash: string,
): Promise<MethodMetadata> {
  const res = await fetch(
    `${API_BASE}/api/solutions/${encodeURIComponent(folder)}/methods/${encodeURIComponent(methodHash)}`,
  )
  if (!res.ok) {
    throw new Error(`API method failed (${res.status})`)
  }
  return (await res.json()) as MethodMetadata
}

export type MethodSourceViewResponse = {
  method: MethodMetadata
  lines: string[]
  startLine: number
}

/** Single round-trip: metadata + method body lines. */
export async function fetchMethodSourceView(
  folder: string,
  methodHash: string,
): Promise<MethodSourceViewResponse> {
  const res = await fetch(
    `${API_BASE}/api/solutions/${encodeURIComponent(folder)}/methods/${encodeURIComponent(methodHash)}/source`,
  )
  if (!res.ok) {
    throw new Error(`API method source failed (${res.status})`)
  }
  const data = (await res.json()) as {
    method: MethodMetadata
    lines: string[]
    startLine: number
  }
  return {
    method: data.method,
    lines: data.lines,
    startLine: data.startLine,
  }
}

export async function fetchSourceSnippet(
  filePath: string,
  startLine: number,
  endLine: number,
): Promise<SourceSnippet> {
  const params = new URLSearchParams({
    path: filePath,
    startLine: String(startLine),
    endLine: String(endLine),
  })
  const res = await fetch(`${API_BASE}/api/source/snippet?${params}`)
  if (!res.ok) {
    throw new Error(`API source snippet failed (${res.status})`)
  }
  return (await res.json()) as SourceSnippet
}
