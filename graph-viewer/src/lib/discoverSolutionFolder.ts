import type { SolutionBundleManifest } from './solutionBundle'

/**
 * Infer a solution bundle manifest from files the user picked (Browse).
 * Expects names like Aimmy2.json, Aimmy2.sln.json, Aimmy2Nodes.json in one folder.
 */
export function manifestFromBrowsedFiles(
  files: File[],
): SolutionBundleManifest | null {
  const jsonFiles = files.filter((f) => f.name.toLowerCase().endsWith('.json'))
  if (!jsonFiles.length) return null

  const slnFile = jsonFiles.find((f) => /\.sln\.json$/i.test(f.name))
  const nodeFiles = jsonFiles
    .filter((f) => /Nodes\.json$/i.test(f.name))
    .map((f) => f.name)
  const relationsFile = jsonFiles.find(
    (f) =>
      !/\.sln\.json$/i.test(f.name) &&
      !/Nodes\.json$/i.test(f.name),
  )

  if (!slnFile || !relationsFile) return null

  const solutionName = relationsFile.name.replace(/\.json$/i, '')
  return {
    solutionName,
    folder: solutionName,
    relationsFile: relationsFile.name,
    slnFile: slnFile.name,
    nodeFiles,
  }
}
