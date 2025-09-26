/**
 * @param {LinkReference} node
 * @param {Parents | undefined} _
 * @param {State} state
 * @param {Info} info
 * @returns {string}
 */
export function linkReference(node: LinkReference, _: Parents | undefined, state: State, info: Info): string;
export namespace linkReference {
    export { linkReferencePeek as peek };
}
import type { LinkReference } from 'mdast';
import type { Parents } from 'mdast';
import type { State } from 'mdast-util-to-markdown';
import type { Info } from 'mdast-util-to-markdown';
/**
 * @returns {string}
 */
declare function linkReferencePeek(): string;
export {};
//# sourceMappingURL=link-reference.d.ts.map