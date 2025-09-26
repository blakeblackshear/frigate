/**
 * @param {Emphasis} node
 * @param {Parents | undefined} _
 * @param {State} state
 * @param {Info} info
 * @returns {string}
 */
export function emphasis(node: Emphasis, _: Parents | undefined, state: State, info: Info): string;
export namespace emphasis {
    export { emphasisPeek as peek };
}
import type { Emphasis } from 'mdast';
import type { Parents } from 'mdast';
import type { State } from 'mdast-util-to-markdown';
import type { Info } from 'mdast-util-to-markdown';
/**
 * @param {Emphasis} _
 * @param {Parents | undefined} _1
 * @param {State} state
 * @returns {string}
 */
declare function emphasisPeek(_: Emphasis, _1: Parents | undefined, state: State): string;
export {};
//# sourceMappingURL=emphasis.d.ts.map