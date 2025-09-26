/**
 * Turn an MDX expression node into an estree node.
 *
 * @param {MdxFlowExpression | MdxTextExpression} node
 *   hast node to transform.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {JsxExpressionContainer}
 *   estree expression.
 */
export function mdxExpression(node: MdxFlowExpression | MdxTextExpression, state: State): JsxExpressionContainer;
import type { MdxFlowExpressionHast as MdxFlowExpression } from 'mdast-util-mdx-expression';
import type { MdxTextExpressionHast as MdxTextExpression } from 'mdast-util-mdx-expression';
import type { State } from 'hast-util-to-estree';
import type { JSXExpressionContainer as JsxExpressionContainer } from 'estree-jsx';
//# sourceMappingURL=mdx-expression.d.ts.map