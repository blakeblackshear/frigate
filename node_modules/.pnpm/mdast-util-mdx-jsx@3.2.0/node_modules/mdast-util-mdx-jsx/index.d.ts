import type {Program} from 'estree-jsx'
import type {Data as HastData, ElementContent, Parent as HastParent} from 'hast'
import type {
  BlockContent,
  Data as MdastData,
  DefinitionContent,
  Parent as MdastParent,
  PhrasingContent
} from 'mdast'
import type {Data, Node} from 'unist'
import type {Tag} from './lib/index.js'

// Expose JavaScript API.
export {mdxJsxFromMarkdown, mdxJsxToMarkdown} from './lib/index.js'

// Expose options.
export type {ToMarkdownOptions} from './lib/index.js'

// Expose node types.
/**
 * MDX JSX attribute value set to an expression.
 *
 * ```markdown
 * > | <a b={c} />
 *          ^^^
 * ```
 */
export interface MdxJsxAttributeValueExpression extends Node {
  /**
   * Node type.
   */
  type: 'mdxJsxAttributeValueExpression'

  /**
   * Value.
   */
  value: string

  /**
   * Data associated with the mdast MDX JSX attribute value expression.
   */
  data?: MdxJsxAttributeValueExpressionData | undefined
}

/**
 * Info associated with mdast MDX JSX attribute value expression nodes by the
 * ecosystem.
 */
export interface MdxJsxAttributeValueExpressionData extends Data {
  /**
   * Program node from estree.
   */
  estree?: Program | null | undefined
}

/**
 * MDX JSX attribute as an expression.
 *
 * ```markdown
 * > | <a {...b} />
 *        ^^^^^^
 * ```
 */
export interface MdxJsxExpressionAttribute extends Node {
  /**
   * Node type.
   */
  type: 'mdxJsxExpressionAttribute'

  /**
   * Value.
   */
  value: string

  /**
   * Data associated with the mdast MDX JSX expression attributes.
   */
  data?: MdxJsxExpressionAttributeData | undefined
}

/**
 * Info associated with mdast MDX JSX expression attribute nodes by the
 * ecosystem.
 */
export interface MdxJsxExpressionAttributeData extends Data {
  /**
   * Program node from estree.
   */
  estree?: Program | null | undefined
}

/**
 * MDX JSX attribute with a key.
 *
 * ```markdown
 * > | <a b="c" />
 *        ^^^^^
 * ```
 */
export interface MdxJsxAttribute extends Node {
  /**
   * Node type.
   */
  type: 'mdxJsxAttribute'
  /**
   * Attribute name.
   */
  name: string
  /**
   * Attribute value.
   */
  value?: MdxJsxAttributeValueExpression | string | null | undefined
  /**
   * Data associated with the mdast MDX JSX attribute.
   */
  data?: MdxJsxAttributeData | undefined
}

/**
 * Info associated with mdast MDX JSX attribute nodes by the
 * ecosystem.
 */
export interface MdxJsxAttributeData extends Data {}

/**
 * MDX JSX element node, occurring in flow (block).
 */
export interface MdxJsxFlowElement extends MdastParent {
  /**
   * Node type.
   */
  type: 'mdxJsxFlowElement'
  /**
   * MDX JSX element name (`null` for fragments).
   */
  name: string | null
  /**
   * MDX JSX element attributes.
   */
  attributes: Array<MdxJsxAttribute | MdxJsxExpressionAttribute>
  /**
   * Content.
   */
  children: Array<BlockContent | DefinitionContent>
  /**
   * Data associated with the mdast MDX JSX elements (flow).
   */
  data?: MdxJsxFlowElementData | undefined
}

/**
 * Info associated with mdast MDX JSX element (flow) nodes by the
 * ecosystem.
 */
export interface MdxJsxFlowElementData extends MdastData {}

/**
 * MDX JSX element node, occurring in text (phrasing).
 */
export interface MdxJsxTextElement extends MdastParent {
  /**
   * Node type.
   */
  type: 'mdxJsxTextElement'
  /**
   * MDX JSX element name (`null` for fragments).
   */
  name: string | null
  /**
   * MDX JSX element attributes.
   */
  attributes: Array<MdxJsxAttribute | MdxJsxExpressionAttribute>
  /**
   * Content.
   */
  children: PhrasingContent[]
  /**
   * Data associated with the mdast MDX JSX elements (text).
   */
  data?: MdxJsxTextElementData | undefined
}

/**
 * Info associated with mdast MDX JSX element (text) nodes by the
 * ecosystem.
 */
export interface MdxJsxTextElementData extends MdastData {}

/**
 * MDX JSX element node, occurring in flow (block), for hast.
 */
export interface MdxJsxFlowElementHast extends HastParent {
  /**
   * Node type.
   */
  type: 'mdxJsxFlowElement'
  /**
   * MDX JSX element name (`null` for fragments).
   */
  name: string | null
  /**
   * MDX JSX element attributes.
   */
  attributes: Array<MdxJsxAttribute | MdxJsxExpressionAttribute>
  /**
   * Content.
   */
  children: ElementContent[]
  /**
   * Data associated with the hast MDX JSX elements (flow).
   */
  data?: MdxJsxFlowElementHastData | undefined
}

/**
 * Info associated with hast MDX JSX element (flow) nodes by the
 * ecosystem.
 */
export interface MdxJsxFlowElementHastData extends HastData {}

/**
 * MDX JSX element node, occurring in text (phrasing), for hast.
 */
export interface MdxJsxTextElementHast extends HastParent {
  /**
   * Node type.
   */
  type: 'mdxJsxTextElement'
  /**
   * MDX JSX element name (`null` for fragments).
   */
  name: string | null
  /**
   * MDX JSX element attributes.
   */
  attributes: Array<MdxJsxAttribute | MdxJsxExpressionAttribute>
  /**
   * Content.
   */
  children: ElementContent[]
  /**
   * Data associated with the hast MDX JSX elements (text).
   */
  data?: MdxJsxTextElementHastData | undefined
}

/**
 * Info associated with hast MDX JSX element (text) nodes by the
 * ecosystem.
 */
export interface MdxJsxTextElementHastData extends HastData {}

// Add nodes to mdast content.
declare module 'mdast' {
  interface BlockContentMap {
    /**
     * MDX JSX element node, occurring in flow (block).
     */
    mdxJsxFlowElement: MdxJsxFlowElement
  }

  interface PhrasingContentMap {
    /**
     * MDX JSX element node, occurring in text (phrasing).
     */
    mdxJsxTextElement: MdxJsxTextElement
  }

  interface RootContentMap {
    /**
     * MDX JSX element node, occurring in flow (block).
     */
    mdxJsxFlowElement: MdxJsxFlowElement
    /**
     * MDX JSX element node, occurring in text (phrasing).
     */
    mdxJsxTextElement: MdxJsxTextElement
  }
}

// Add nodes to hast content.
declare module 'hast' {
  interface ElementContentMap {
    /**
     * MDX JSX element node, occurring in text (phrasing).
     */
    mdxJsxTextElement: MdxJsxTextElementHast
    /**
     * MDX JSX element node, occurring in flow (block).
     */
    mdxJsxFlowElement: MdxJsxFlowElementHast
  }

  interface RootContentMap {
    /**
     * MDX JSX element node, occurring in text (phrasing).
     */
    mdxJsxTextElement: MdxJsxTextElementHast
    /**
     * MDX JSX element node, occurring in flow (block).
     */
    mdxJsxFlowElement: MdxJsxFlowElementHast
  }
}

// Add custom data tracked to turn markdown into a tree.
declare module 'mdast-util-from-markdown' {
  interface CompileData {
    /**
     * Current MDX JSX tag.
     */
    mdxJsxTag?: Tag | undefined

    /**
     * Current stack of open MDX JSX tags.
     */
    mdxJsxTagStack?: Tag[] | undefined
  }
}

// Add custom data tracked to turn a syntax tree into markdown.
declare module 'mdast-util-to-markdown' {
  interface ConstructNameMap {
    /**
     * Whole JSX element, in flow.
     *
     * ```markdown
     * > | <a />
     *     ^^^^^
     * ```
     */
    mdxJsxFlowElement: 'mdxJsxFlowElement'

    /**
     * Whole JSX element, in text.
     *
     * ```markdown
     * > | a <b />.
     *       ^^^^^
     * ```
     */
    mdxJsxTextElement: 'mdxJsxTextElement'
  }
}
