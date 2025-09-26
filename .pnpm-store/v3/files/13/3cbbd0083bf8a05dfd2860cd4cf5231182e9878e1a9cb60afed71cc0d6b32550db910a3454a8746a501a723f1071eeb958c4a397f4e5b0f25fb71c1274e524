/**
 * Add support for serializing to markdown.
 *
 * @param {Readonly<Options> | null | undefined} [options]
 *   Configuration (optional).
 * @returns {undefined}
 *   Nothing.
 */
export default function remarkStringify(options?: Readonly<Options> | null | undefined): undefined;
export default class remarkStringify {
    /**
     * Add support for serializing to markdown.
     *
     * @param {Readonly<Options> | null | undefined} [options]
     *   Configuration (optional).
     * @returns {undefined}
     *   Nothing.
     */
    constructor(options?: Readonly<Options> | null | undefined);
    compiler: (tree: import("mdast").Root, file: import("vfile").VFile) => string;
}
export type Root = import('mdast').Root;
export type ToMarkdownOptions = import('mdast-util-to-markdown').Options;
export type Compiler = import('unified').Compiler<Root, string>;
export type Processor = import('unified').Processor<undefined, undefined, undefined, Root, string>;
export type Options = Omit<ToMarkdownOptions, 'extensions'>;
