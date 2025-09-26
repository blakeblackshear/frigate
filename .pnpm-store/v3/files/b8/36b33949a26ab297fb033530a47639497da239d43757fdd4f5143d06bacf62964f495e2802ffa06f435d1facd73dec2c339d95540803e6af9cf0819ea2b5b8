/**
 * @import {MDXModule} from 'mdx/types.js'
 * @import {RunOptions} from './util/resolve-evaluate-options.js'
 */

/** @type {new (code: string, ...args: Array<unknown>) => Function} **/
const AsyncFunction = Object.getPrototypeOf(run).constructor

/**
 * Run code compiled with `outputFormat: 'function-body'`.
 *
 * > ☢️ **Danger**: this `eval`s JavaScript.
 *
 * @param {{toString(): string}} code
 *   JavaScript function body to run.
 * @param {RunOptions} options
 *   Configuration (**required**).
 * @return {Promise<MDXModule>}
 *   Promise to a module;
 *   the result is an object with a `default` field set to the component;
 *   anything else that was exported is available too.
 */
export async function run(code, options) {
  return new AsyncFunction(String(code))(options)
}

/**
 * Run code, synchronously.
 *
 * When possible please use the async `run`.
 *
 * > ☢️ **Danger**: this `eval`s JavaScript.
 *
 * @param {{toString(): string}} code
 *   JavaScript function body to run.
 * @param {RunOptions} options
 *   Configuration (**required**).
 * @return {MDXModule}
 *   Module.
 */
export function runSync(code, options) {
  // eslint-disable-next-line no-new-func
  return new Function(String(code))(options)
}
