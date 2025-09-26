/**
 * @typedef {import('unist').Point} UnistPoint
 * @typedef {import('unist').Position} UnistPosition
 */
/**
 * @typedef {[start: number | null | undefined, end: number | null | undefined]} RangeLike
 *
 * @typedef PointLike
 * @property {number | null | undefined} [line]
 * @property {number | null | undefined} [column]
 *
 * @typedef LocLike
 * @property {PointLike | null | undefined} [start]
 * @property {PointLike | null | undefined} [end]
 *
 * @typedef NodeLike
 * @property {LocLike | null | undefined} [loc]
 * @property {RangeLike | null | undefined} [range]
 * @property {number | null | undefined} [start]
 * @property {number | null | undefined} [end]
 */
/**
 * Turn an estree `node` into a unist `position`.
 *
 * @param {NodeLike | null | undefined} [node]
 *   estree node.
 * @returns {UnistPosition | undefined}
 *   unist position.
 */
export function positionFromEstree(
  node?: NodeLike | null | undefined
): UnistPosition | undefined
export type UnistPoint = import('unist').Point
export type UnistPosition = import('unist').Position
export type RangeLike = [
  start: number | null | undefined,
  end: number | null | undefined
]
export type PointLike = {
  line?: number | null | undefined
  column?: number | null | undefined
}
export type LocLike = {
  start?: PointLike | null | undefined
  end?: PointLike | null | undefined
}
export type NodeLike = {
  loc?: LocLike | null | undefined
  range?: RangeLike | null | undefined
  start?: number | null | undefined
  end?: number | null | undefined
}
