/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { CSSProperties, ReactNode } from 'react';
import type { PrismTheme } from 'prism-react-renderer';
import type { WordWrap } from '../hooks/useCodeWordWrap';
export type MagicCommentConfig = {
    className: string;
    line?: string;
    block?: {
        start: string;
        end: string;
    };
};
export declare function parseCodeBlockTitle(metastring?: string): string;
export declare function getLineNumbersStart({ showLineNumbers, metastring, }: {
    showLineNumbers: boolean | number | undefined;
    metastring: string | undefined;
}): number | undefined;
export declare function containsLineNumbers(metastring?: string): boolean;
type ParseCodeLinesParam = {
    /**
     * The full metastring, as received from MDX. Line ranges declared here
     * start at 1.
     */
    metastring: string | undefined;
    /**
     * Language of the code block, used to determine which kinds of magic
     * comment styles to enable.
     */
    language: string | undefined;
    /**
     * Magic comment types that we should try to parse. Each entry would
     * correspond to one class name to apply to each line.
     */
    magicComments: MagicCommentConfig[];
};
/**
 * The highlighted lines, 0-indexed. e.g. `{ 0: ["highlight", "sample"] }`
 * means the 1st line should have `highlight` and `sample` as class names.
 */
type CodeLineClassNames = {
    [lineIndex: number]: string[];
};
/**
 * Code lines after applying magic comments or metastring highlight ranges
 */
type ParsedCodeLines = {
    code: string;
    lineClassNames: CodeLineClassNames;
};
/**
 * Parses the code content, strips away any magic comments, and returns the
 * clean content and the highlighted lines marked by the comments or metastring.
 *
 * If the metastring contains a range, the `content` will be returned as-is
 * without any parsing. The returned `lineClassNames` will be a map from that
 * number range to the first magic comment config entry (which _should_ be for
 * line highlight directives.)
 */
export declare function parseLines(code: string, params: ParseCodeLinesParam): ParsedCodeLines;
/**
 * Gets the language name from the class name (set by MDX).
 * e.g. `"language-javascript"` => `"javascript"`.
 * Returns undefined if there is no language class name.
 */
export declare function parseClassNameLanguage(className: string | undefined): string | undefined;
export interface CodeBlockMetadata {
    codeInput: string;
    code: string;
    className: string;
    language: string;
    title: ReactNode;
    lineNumbersStart: number | undefined;
    lineClassNames: CodeLineClassNames;
}
export declare function createCodeBlockMetadata(params: {
    code: string;
    className: string | undefined;
    language: string | undefined;
    defaultLanguage: string | undefined;
    metastring: string | undefined;
    magicComments: MagicCommentConfig[];
    title: ReactNode;
    showLineNumbers: boolean | number | undefined;
}): CodeBlockMetadata;
export declare function getPrismCssVariables(prismTheme: PrismTheme): CSSProperties;
type CodeBlockContextValue = {
    metadata: CodeBlockMetadata;
    wordWrap: WordWrap;
};
export declare function CodeBlockContextProvider({ metadata, wordWrap, children, }: {
    metadata: CodeBlockMetadata;
    wordWrap: WordWrap;
    children: ReactNode;
}): ReactNode;
export declare function useCodeBlockContext(): CodeBlockContextValue;
export {};
//# sourceMappingURL=codeBlockUtils.d.ts.map