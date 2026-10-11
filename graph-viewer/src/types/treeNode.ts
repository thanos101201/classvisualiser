/** Mirrors Forest.TreeNode from ProjectExplorer (System.Text.Json PascalCase). */
export type NodeType = 'None' | 'Tree' | 'Leave'

export interface TreeNode {
  ID?: string
  Type?: NodeType | number
  HashName: string
  NameSpace?: string
  Name?: string
  Children?: string[]
  Parents?: string[]
  FilePaths?: string[]
}

/** Parent hash → child hashes (NodeManager relations export). */
export type RelationsMap = Record<string, string[]>

/** Project name → all node hashes in that project. */
export type ProjectsNodeIndex = Record<string, string[]>

/** Serialized node store: hash → TreeNode. */
export type NodeStore = Record<string, TreeNode>

export interface GraphNode {
  id: string
  label: string
  nameSpace?: string
  type?: NodeType | number
  filePaths?: string[]
  val: number
}

export interface GraphLink {
  source: string
  target: string
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}
