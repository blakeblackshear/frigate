import type {Program} from 'estree-jsx'
import type {Data as HastData, Literal as HastLiteral} from 'hast'
import type {Data as MdastData, Literal as MdastLiteral} from 'mdast'

export {mdxjsEsmFromMarkdown, mdxjsEsmToMarkdown} from './lib/index.js'

/**
 * MDX ESM (import/export) node.
 */
export interface MdxjsEsm extends MdastLiteral {
  /**
   * Node type.
   */
  type: 'mdxjsEsm'

  /**
   * Data associated with mdast MDX.js ESM.
   */
  data?: MdxjsEsmData | undefined
}

/**
 * Info associated with mdast MDX.js ESM nodes by the ecosystem.
 */
export interface MdxjsEsmData extends MdastData {
  /**
   * Program node from estree.
   */
  estree?: Program | null | undefined
}

/**
 * MDX ESM (import/export) node (for hast).
 */
export interface MdxjsEsmHast extends HastLiteral {
  /**
   * Node type.
   */
  type: 'mdxjsEsm'

  /**
   * Data associated with hast MDX.js ESM.
   */
  data?: MdxjsEsmHastData | undefined
}

/**
 * Info associated with hast MDX.js ESM nodes by the ecosystem.
 */
export interface MdxjsEsmHastData extends HastData {
  /**
   * Program node from estree.
   */
  estree?: Program | null | undefined
}

// Add nodes to mdast content.
declare module 'mdast' {
  interface FrontmatterContentMap {
    /**
     * MDX ESM.
     */
    mdxjsEsm: MdxjsEsm
  }

  interface RootContentMap {
    /**
     * MDX ESM.
     */
    mdxjsEsm: MdxjsEsm
  }
}

// Add nodes to hast content.
declare module 'hast' {
  interface RootContentMap {
    /**
     * MDX ESM.
     */
    mdxjsEsm: MdxjsEsmHast
  }
}
