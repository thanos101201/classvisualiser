import type { SolutionBundleManifest } from './solutionBundle'

/**
 * Detect a solution bundle from JSON filenames in one directory.
 *
 * Required:
 * - Exactly one `*.sln.json` (project → hashes), OR pick `{folder}.sln.json` if several
 * - Exactly one relations `*.json` that is not `*.sln.json` or `*Nodes.json`
 *   (if several, prefer `{folder}.json` or `{SlnBase}.json` matching the sln file)
 * Optional:
 * - Any number of `*Nodes.json` (metadata per project)
 */
export function discoverBundleManifestFromFileNames(
  folder: string,
  fileNames: string[],
): SolutionBundleManifest | null {
  const json = fileNames.filter((n) => n.toLowerCase().endsWith('.json'))
  const slnCandidates = json.filter((n) => /\.sln\.json$/i.test(n))
  if (!slnCandidates.length) return null

  const slnFile =
    slnCandidates.find((n) => n === `${folder}.sln.json`) ??
    (slnCandidates.length === 1 ? slnCandidates[0] : null)

  if (!slnFile) return null

  const slnBase = slnFile.replace(/\.sln\.json$/i, '')
  const relationCandidates = json.filter(
    (n) => !/\.sln\.json$/i.test(n) && !/Nodes\.json$/i.test(n),
  )
  if (!relationCandidates.length) return null

  const relationsFile =
    relationCandidates.find((n) => n === `${folder}.json`) ??
    relationCandidates.find((n) => n === `${slnBase}.json`) ??
    (relationCandidates.length === 1 ? relationCandidates[0] : null)

  if (!relationsFile) return null

  const nodeFiles = json
    .filter((n) => /Nodes\.json$/i.test(n))
    .sort((a, b) => a.localeCompare(b))

  const solutionName = relationsFile.replace(/\.json$/i, '')

  return {
    solutionName,
    folder,
    relationsFile,
    slnFile,
    nodeFiles,
  }
}

export function manifestFromBrowsedFiles(
  files: File[],
): SolutionBundleManifest | null {
  if (!files.length) return null
  const names = files.map((f) => f.name)
  return discoverBundleManifestFromFileNames('local', names)
}
