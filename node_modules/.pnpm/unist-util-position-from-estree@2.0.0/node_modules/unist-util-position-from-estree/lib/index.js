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
export function positionFromEstree(node) {
  const nodeLike = node || {}
  const loc = nodeLike.loc || {}
  const range = nodeLike.range || [undefined, undefined]
  const start = pointOrUndefined(loc.start, range[0] || nodeLike.start)
  const end = pointOrUndefined(loc.end, range[1] || nodeLike.end)

  if (start && end) {
    return {start, end}
  }
}

/**
 * @param {unknown} estreePoint
 *   estree point.
 * @param {unknown} estreeOffset
 *  estree offset.
 * @returns {UnistPoint | undefined}
 *   unist point.
 */
function pointOrUndefined(estreePoint, estreeOffset) {
  if (estreePoint && typeof estreePoint === 'object') {
    const line =
      'line' in estreePoint ? numberOrUndefined(estreePoint.line) : undefined
    const column =
      'column' in estreePoint
        ? numberOrUndefined(estreePoint.column)
        : undefined

    if (line && column !== undefined) {
      return {
        line,
        column: column + 1,
        offset: numberOrUndefined(estreeOffset)
      }
    }
  }
}

/**
 * @param {unknown} value
 * @returns {number | undefined}
 */
function numberOrUndefined(value) {
  return typeof value === 'number' && value > -1 ? value : undefined
}
