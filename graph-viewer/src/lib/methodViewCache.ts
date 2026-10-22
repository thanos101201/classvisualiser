import { fetchMethodSourceView } from './explorerApi'
import type { MethodMetadata } from '../types/method'

export type MethodView = {
  method: MethodMetadata
  lines: string[]
  startLine: number
}

const viewCache = new Map<string, MethodView>()
const inflight = new Map<string, Promise<MethodView>>()

const MAX_BACKGROUND = 3
let backgroundActive = 0
const backgroundQueue: Array<() => void> = []

function cacheKey(folder: string, methodHash: string) {
  return `${folder}:${methodHash}`
}

function runBackground(task: () => Promise<void>) {
  const start = () => {
    backgroundActive++
    task()
      .catch(() => {})
      .finally(() => {
        backgroundActive--
        const next = backgroundQueue.shift()
        if (next) next()
      })
  }

  if (backgroundActive < MAX_BACKGROUND) start()
  else backgroundQueue.push(start)
}

function fetchAndCache(
  solutionFolder: string,
  methodHash: string,
): Promise<MethodView> {
  const key = cacheKey(solutionFolder, methodHash)
  const promise = fetchMethodSourceView(solutionFolder, methodHash)
    .then((view) => {
      viewCache.set(key, view)
      inflight.delete(key)
      return view
    })
    .catch((err) => {
      inflight.delete(key)
      throw err
    })

  inflight.set(key, promise)
  return promise
}

export function loadMethodView(
  solutionFolder: string,
  methodHash: string,
): Promise<MethodView> {
  const key = cacheKey(solutionFolder, methodHash)
  const cached = viewCache.get(key)
  if (cached) return Promise.resolve(cached)

  const pending = inflight.get(key)
  if (pending) return pending

  return fetchAndCache(solutionFolder, methodHash)
}

/** Warm cache on hover; low priority, limited concurrency. */
export function prefetchMethodView(
  solutionFolder: string,
  methodHash: string,
): void {
  const key = cacheKey(solutionFolder, methodHash)
  if (viewCache.has(key) || inflight.has(key)) return

  runBackground(async () => {
    await loadMethodView(solutionFolder, methodHash)
  })
}
