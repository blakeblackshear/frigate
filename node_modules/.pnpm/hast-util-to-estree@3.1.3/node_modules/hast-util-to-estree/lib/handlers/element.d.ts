/**
 * Turn a hast element into an estree node.
 *
 * @param {HastElement} node
 *   hast node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {JsxElement}
 *   estree expression.
 */
export function element(node: HastElement, state: State): JsxElement;
import type { Element as HastElement } from 'hast';
import type { State } from 'hast-util-to-estree';
import type { JSXElement as JsxElement } from 'estree-jsx';
//# sourceMappingURL=element.d.ts.map