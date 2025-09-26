import type {Options} from 'esast-util-from-js'
import type {Program} from 'estree'
import type {Plugin} from 'unified'

export type {Options} from 'esast-util-from-js'

// Note: we have to use manual types here,
// instead of getting them from `lib/index.js`,
// because TS generates wrong types for functions that use `this`.
// TS makes them into classes which is incorrect.
/**
 * Plugin to add support for parsing from JavaScript.
 *
 * @this
 *   Unified processor.
 * @param
 *   Configuration (optional).
 * @returns
 *   Nothing.
 */
declare const recmaParse: Plugin<
  [(Readonly<Options> | null | undefined)?],
  string,
  Program
>
export default recmaParse

// Add custom settings supported when `recma-parse` is added.
declare module 'unified' {
  interface Settings extends Options {}
}
