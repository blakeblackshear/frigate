export {gfmFootnoteFromMarkdown, gfmFootnoteToMarkdown} from './lib/index.js'

export interface ToMarkdownOptions {
  // To do: next major: change default.
  /**
   * Use a blank line for the first line of footnote definitions
   * (`boolean`, default: `false`).
   */
  firstLineBlank?: boolean | null | undefined
}

declare module 'mdast-util-to-markdown' {
  interface ConstructNameMap {
    /**
     * Footnote definition.
     *
     * ```markdown
     * > | [^a]: B.
     *     ^^^^^^^^
     * ```
     */
    footnoteDefinition: 'footnoteDefinition'

    /**
     * Footnote reference.
     *
     * ```markdown
     * > | A[^b].
     *      ^^^^
     * ```
     */
    footnoteReference: 'footnoteReference'
  }
}
