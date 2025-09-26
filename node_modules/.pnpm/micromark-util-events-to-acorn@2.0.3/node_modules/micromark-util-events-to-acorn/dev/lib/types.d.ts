import type {Point as MicromarkPoint} from 'micromark-util-types'
import type {Program} from 'estree'

/**
 * Point.
 */
interface AcornLoc {
  /**
   * Column.
   */
  column: number
  /**
   * Line.
   */
  line: number
}

export interface AcornError extends Error {
  /**
   * Location.
   */
  loc: AcornLoc
  /**
   * Index.
   */
  pos: number
  /**
   * Index.
   */
  raisedAt: number
}

/**
 * See: <https://github.com/wooorm/markdown-rs/blob/e692ab0/src/util/mdx_collect.rs#L10>.
 */
export interface Collection {
  stops: Array<Stop>
  value: string
}

/**
 * Result.
 */
export interface Result {
  /**
   * Error if unparseable
   */
  error: AcornError | undefined
  /**
   * Program.
   */
  estree: Program | undefined
  /**
   * Whether the error, if there is one, can be swallowed and more JavaScript
   * could be valid.
   */
  swallow: boolean
}

/**
 * Stop.
 */
export type Stop = [from: number, to: MicromarkPoint]
