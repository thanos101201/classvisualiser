import { useCallback, useEffect, useState } from 'react'
import {
  fetchMethodMetadata,
  fetchSourceSnippet,
} from '../lib/explorerApi'
import type { MethodCallSiteRef, MethodMetadata } from '../types/method'

type Props = {
  solutionFolder: string
  methodHash: string
  onClose: () => void
  onNavigateToMethod: (methodHash: string) => void
}

function callsOnLine(calls: MethodCallSiteRef[], line: number): MethodCallSiteRef[] {
  return calls.filter(
    (c) => line >= c.span.startLine && line <= c.span.endLine,
  )
}

export function MethodCodePanel({
  solutionFolder,
  methodHash,
  onClose,
  onNavigateToMethod,
}: Props) {
  const [method, setMethod] = useState<MethodMetadata | null>(null)
  const [lines, setLines] = useState<string[]>([])
  const [startLine, setStartLine] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const meta = await fetchMethodMetadata(solutionFolder, methodHash)
        if (cancelled) return
        setMethod(meta)
        const snippet = await fetchSourceSnippet(
          meta.filePath,
          meta.bodySpan.startLine,
          meta.bodySpan.endLine,
        )
        if (cancelled) return
        setLines(snippet.lines)
        setStartLine(snippet.startLine)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load method')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [solutionFolder, methodHash])

  const handleLineClick = useCallback(
    (absoluteLine: number) => {
      if (!method) return
      const matches = callsOnLine(method.calls, absoluteLine).filter(
        (c) => c.calleeMethodHash,
      )
      const target =
        matches.find((c) => c.span.startLine === absoluteLine) ?? matches[0]
      if (target?.calleeMethodHash) {
        onNavigateToMethod(target.calleeMethodHash)
      }
    },
    [method, onNavigateToMethod],
  )

  return (
    <>
      <button
        type="button"
        className="close-btn"
        onClick={onClose}
        aria-label="Back to type details"
      >
        ×
      </button>
      <button type="button" className="back-btn" onClick={onClose}>
        ← Type details
      </button>

      {loading && <p className="hint">Loading method…</p>}
      {error && <p className="search-feedback">{error}</p>}

      {method && !loading && !error && (
        <>
          <h2 className="method-title">{method.name}</h2>
          <p className="mono block muted">{method.methodHash}</p>
          <p className="detail-hint">
            Click a highlighted line to open a called method (when resolved).
          </p>

          <pre className="method-code">
            {lines.map((text, index) => {
              const lineNo = startLine + index
              const lineCalls = callsOnLine(method.calls, lineNo)
              const clickable = lineCalls.some((c) => c.calleeMethodHash)
              const title = lineCalls
                .map((c) => c.calleeDisplayName ?? c.calleeMethodHash)
                .join(', ')

              return (
                <div
                  key={lineNo}
                  className={`code-line ${clickable ? 'code-line-call' : ''}`}
                  onClick={() => clickable && handleLineClick(lineNo)}
                  title={clickable ? title : undefined}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      handleLineClick(lineNo)
                    }
                  }}
                >
                  <span className="line-no">{lineNo}</span>
                  <span className="line-text">{text || ' '}</span>
                </div>
              )
            })}
          </pre>
        </>
      )}
    </>
  )
}
