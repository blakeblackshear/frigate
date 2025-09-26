/**
 * Compile and run MDX.
 *
 * When you trust your content, `evaluate` can work.
 * When possible, use `compile`, write to a file, and then run with Node or use
 * one of the integrations.
 *
 * > ☢️ **Danger**: it’s called **evaluate** because it `eval`s JavaScript.
 *
 * ###### Notes
 *
 * Compiling (and running) MDX takes time.
 *
 * If you are live-rendering a string of MDX that often changes using a virtual
 * DOM based framework (such as React), one performance improvement is to call
 * the `MDXContent` component yourself.
 * The reason is that the `evaluate` creates a new function each time, which
 * cannot be diffed:
 *
 * ```diff
 *  const {default: MDXContent} = await evaluate('…')
 *
 * -<MDXContent {...props} />
 * +MDXContent(props)
 * ```
 *
 * @param {Readonly<Compatible>} file
 *   MDX document to parse.
 * @param {Readonly<EvaluateOptions>} options
 *   Configuration (**required**).
 * @return {Promise<MDXModule>}
 *   Promise to a module;
 *   the result is an object with a `default` field set to the component;
 *   anything else that was exported is available too.

 */
export function evaluate(file: Readonly<Compatible>, options: Readonly<EvaluateOptions>): Promise<MDXModule>;
/**
 * Compile and run MDX, synchronously.
 *
 * When possible please use the async `evaluate`.
 *
 * > ☢️ **Danger**: it’s called **evaluate** because it `eval`s JavaScript.
 *
 * @param {Readonly<Compatible>} file
 *   MDX document to parse.
 * @param {Readonly<EvaluateOptions>} options
 *   Configuration (**required**).
 * @return {MDXModule}
 *   Module.
 */
export function evaluateSync(file: Readonly<Compatible>, options: Readonly<EvaluateOptions>): MDXModule;
import type { Compatible } from 'vfile';
import type { EvaluateOptions } from './util/resolve-evaluate-options.js';
import type { MDXModule } from 'mdx/types.js';
//# sourceMappingURL=evaluate.d.ts.map