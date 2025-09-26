// Standard, based on CSSOM View spec
export type ScrollBehavior = 'auto' | 'smooth'
export type ScrollLogicalPosition = 'start' | 'center' | 'end' | 'nearest'
// This new option is tracked in this PR, which is the most likely candidate at the time: https://github.com/w3c/csswg-drafts/pull/1805
export type ScrollMode = 'always' | 'if-needed'
// New option that skips auto-scrolling all nodes with overflow: hidden set
// See FF implementation: https://hg.mozilla.org/integration/fx-team/rev/c48c3ec05012#l7.18
export type SkipOverflowHiddenElements = boolean

export interface Options {
  block?: ScrollLogicalPosition
  inline?: ScrollLogicalPosition
  scrollMode?: ScrollMode
  boundary?: CustomScrollBoundary
  skipOverflowHiddenElements?: SkipOverflowHiddenElements
}

// Custom behavior, not in any spec
export type CustomScrollBoundaryCallback = (parent: Element) => boolean
export type CustomScrollBoundary = Element | CustomScrollBoundaryCallback | null
export interface CustomScrollAction {
  el: Element
  top: number
  left: number
}
export type CustomScrollBehaviorCallback<T> = (
  actions: CustomScrollAction[]
) => T
