export interface SourceSpan {
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
}

export interface MethodCallSiteRef {
  span: SourceSpan
  calleeMethodHash: string | null
  calleeDisplayName: string | null
}

export interface MethodMetadata {
  methodHash: string
  typeHash: string
  name: string
  filePath: string
  bodySpan: SourceSpan
  calls: MethodCallSiteRef[]
}

export interface SourceSnippet {
  filePath: string
  startLine: number
  endLine: number
  lines: string[]
}
