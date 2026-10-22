export const METHOD_CARD_WIDTH = 300
export const METHOD_CARD_GAP_X = 100
export const METHOD_CARD_GAP_Y = 32
export const METHOD_CARD_HEADER = 52
export const METHOD_LINE_HEIGHT = 18

export function estimateCardHeight(lineCount: number): number {
  return METHOD_CARD_HEADER + lineCount * METHOD_LINE_HEIGHT + 16
}

export type LayoutNode = {
  methodHash: string
  x: number
  y: number
  depth: number
  lineCount: number
}

export function placeChildNode(
  parent: LayoutNode,
  siblingIndex: number,
): { x: number; y: number; depth: number } {
  return {
    depth: parent.depth + 1,
    x: parent.x + METHOD_CARD_WIDTH + METHOD_CARD_GAP_X,
    y: parent.y + siblingIndex * (estimateCardHeight(parent.lineCount) + METHOD_CARD_GAP_Y),
  }
}
