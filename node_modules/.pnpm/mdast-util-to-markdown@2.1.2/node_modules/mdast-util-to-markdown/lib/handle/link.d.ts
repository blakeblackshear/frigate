/**
 * @param {Link} node
 * @param {Parents | undefined} _
 * @param {State} state
 * @param {Info} info
 * @returns {string}
 */
export function link(node: Link, _: Parents | undefined, state: State, info: Info): string;
export namespace link {
    export { linkPeek as peek };
}
import type { Link } from 'mdast';
import type { Parents } from 'mdast';
import type { State } from 'mdast-util-to-markdown';
import type { Info } from 'mdast-util-to-markdown';
/**
 * @param {Link} node
 * @param {Parents | undefined} _
 * @param {State} state
 * @returns {string}
 */
declare function linkPeek(node: Link, _: Parents | undefined, state: State): string;
export {};
//# sourceMappingURL=link.d.ts.map