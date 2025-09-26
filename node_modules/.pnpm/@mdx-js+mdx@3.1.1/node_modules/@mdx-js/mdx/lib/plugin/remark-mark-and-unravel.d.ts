/**
 * A tiny plugin that unravels `<p><h1>x</h1></p>` but also
 * `<p><Component /></p>` (so it has no knowledge of “HTML”).
 *
 * It also marks JSX as being explicitly JSX, so when a user passes a `h1`
 * component, it is used for `# heading` but not for `<h1>heading</h1>`.
 *
 * @returns
 *   Transform.
 */
export function remarkMarkAndUnravel(): (tree: Root) => undefined;
import type { Root } from 'mdast';
//# sourceMappingURL=remark-mark-and-unravel.d.ts.map