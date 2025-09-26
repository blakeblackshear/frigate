/**
 * @param {Image} node
 * @param {Parents | undefined} _
 * @param {State} state
 * @param {Info} info
 * @returns {string}
 */
export function image(node: Image, _: Parents | undefined, state: State, info: Info): string;
export namespace image {
    export { imagePeek as peek };
}
import type { Image } from 'mdast';
import type { Parents } from 'mdast';
import type { State } from 'mdast-util-to-markdown';
import type { Info } from 'mdast-util-to-markdown';
/**
 * @returns {string}
 */
declare function imagePeek(): string;
export {};
//# sourceMappingURL=image.d.ts.map