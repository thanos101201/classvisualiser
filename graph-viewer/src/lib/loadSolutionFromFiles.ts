import { parseGraphJsonContent, parseNodeStore } from './buildGraphData'
import { manifestFromBrowsedFiles } from './discoverSolutionFolder'
import { mergeNodeStores, type SolutionBundle } from './solutionBundle'
import type { ProjectsNodeIndex } from '../types/treeNode'

export async function loadSolutionFromBrowsedFiles(
  files: File[],
): Promise<SolutionBundle> {
  const manifest = manifestFromBrowsedFiles(files)
  if (!manifest) {
    throw new Error(
      'Select a solution set together: {Solution}.json, {Solution}.sln.json, and optional *Nodes.json files.',
    )
  }

  const byName = new Map(files.map((f) => [f.name, f]))

  const relationsFile = byName.get(manifest.relationsFile)
  const slnFile = byName.get(manifest.slnFile)
  if (!relationsFile || !slnFile) {
    throw new Error('Missing required .json or .sln.json in the selection.')
  }

  const relationsRaw = JSON.parse(await relationsFile.text())
  const { relations } = parseGraphJsonContent(relationsRaw)
  const projectsIndex = JSON.parse(
    await slnFile.text(),
  ) as ProjectsNodeIndex

  const nodeStores = []
  for (const name of manifest.nodeFiles) {
    const file = byName.get(name)
    if (!file) continue
    const store = parseNodeStore(JSON.parse(await file.text()))
    if (store) nodeStores.push(store)
  }

  return {
    manifest,
    relations,
    projectsIndex,
    nodeStore: mergeNodeStores(nodeStores),
  }
}
