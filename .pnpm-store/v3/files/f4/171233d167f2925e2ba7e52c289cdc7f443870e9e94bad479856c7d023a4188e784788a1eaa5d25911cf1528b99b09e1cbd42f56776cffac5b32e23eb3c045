import type {Options as ToJsOptions} from 'estree-util-to-js'
import type {Program} from 'estree'
import type {Plugin} from 'unified'

export interface Options extends ToJsOptions {
  /**
   * Automatically handled;
   * not needed to pass in `recma-stringify`
   */
  filePath?: never
}

// Note: we have to use manual types here,
// instead of getting them from `lib/index.js`,
// because TS generates wrong types for functions that use `this`.
// TS makes them into classes which is incorrect.
/**
 * Plugin to add support for serializing as JavaScript.
 *
 * @this
 *   Unified processor.
 * @param
 *   Configuration (optional).
 * @returns
 *   Nothing.
 */
declare const recmaStringify: Plugin<
  [(Readonly<Options> | null | undefined)?],
  Program,
  string
>
export default recmaStringify

// Add custom settings supported when `recma-stringify` is added.
declare module 'unified' {
  interface Settings extends Options {}
}
