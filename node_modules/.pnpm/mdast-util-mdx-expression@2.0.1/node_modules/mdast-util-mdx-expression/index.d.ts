import type {Program} from 'estree-jsx'
import type {Data as HastData, Literal as HastLiteral} from 'hast'
import type {Data as MdastData, Literal as MdastLiteral} from 'mdast'

export {
  mdxExpressionFromMarkdown,
  mdxExpressionToMarkdown
} from './lib/index.js'

/**
 * MDX expression node, occurring in flow (block).
 */
export interface MdxFlowExpression extends MdastLiteral {
  /**
   * Node type.
   */
  type: 'mdxFlowExpression'

  /**
   * Data associated with the mdast MDX expression (flow).
   */
  data?: MdxFlowExpressionData | undefined
}

/**
 * Info associated with mdast MDX expression (flow) nodes by the ecosystem.
 */
export interface MdxFlowExpressionData extends MdastData {
  /**
   * Program node from estree.
   */
  estree?: Program | null | undefined
}

/**
 * MDX expression node, occurring in text (phrasing).
 */
export interface MdxTextExpression extends MdastLiteral {
  /**
   * Node type.
   */
  type: 'mdxTextExpression'

  /**
   * Data associated with the mdast MDX expression (text).
   */
  data?: MdxTextExpressionData | undefined
}

/**
 * Info associated with mdast MDX expression (text) nodes by the ecosystem.
 */
export interface MdxTextExpressionData extends MdastData {
  /**
   * Program node from estree.
   */
  estree?: Program | null | undefined
}

/**
 * MDX expression node, occurring in flow (block), for hast.
 */
export interface MdxFlowExpressionHast extends HastLiteral {
  /**
   * Node type.
   */
  type: 'mdxFlowExpression'

  /**
   * Data associated with the hast MDX expression (flow).
   */
  data?: MdxFlowExpressionHastData | undefined
}

/**
 * Info associated with hast MDX expression (flow) nodes by the ecosystem.
 */
export interface MdxFlowExpressionHastData extends HastData {
  /**
   * Program node from estree.
   */
  estree?: Program | null | undefined
}

/**
 * MDX expression node, occurring in text (phrasing), for hast.
 */
export interface MdxTextExpressionHast extends HastLiteral {
  /**
   * Node type.
   */
  type: 'mdxTextExpression'

  /**
   * Data associated with the hast MDX expression (text).
   */
  data?: MdxTextExpressionHastData | undefined
}

/**
 * Info associated with hast MDX expression (text) nodes by the ecosystem.
 */
export interface MdxTextExpressionHastData extends HastData {
  /**
   * Program node from estree.
   */
  estree?: Program | null | undefined
}

// Add nodes to mdast content.
declare module 'mdast' {
  interface RootContentMap {
    /**
     * MDX expression node, occurring in text (phrasing).
     */
    mdxTextExpression: MdxTextExpression
    /**
     * MDX expression node, occurring in flow (block).
     */
    mdxFlowExpression: MdxFlowExpression
  }

  interface PhrasingContentMap {
    /**
     * MDX expression node, occurring in text (phrasing).
     */
    mdxTextExpression: MdxTextExpression
  }

  interface BlockContentMap {
    /**
     * MDX expression node, occurring in flow (block).
     */
    mdxFlowExpression: MdxFlowExpression
  }
}

// Add nodes to hast content.
declare module 'hast' {
  interface RootContentMap {
    /**
     * MDX expression node, occurring in flow (block).
     */
    mdxFlowExpression: MdxFlowExpressionHast
    /**
     * MDX expression node, occurring in text (phrasing).
     */
    mdxTextExpression: MdxTextExpressionHast
  }

  interface ElementContentMap {
    /**
     * MDX expression node, occurring in flow (block).
     */
    mdxFlowExpression: MdxFlowExpressionHast
    /**
     * MDX expression node, occurring in text (phrasing).
     */
    mdxTextExpression: MdxTextExpressionHast
  }
}
