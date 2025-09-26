/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { Position, Range } from 'vscode-languageserver-types';
import type { CstNode } from '../syntax-tree.js';
export interface JSDocComment extends JSDocValue {
    readonly elements: JSDocElement[];
    getTag(name: string): JSDocTag | undefined;
    getTags(name: string): JSDocTag[];
}
export type JSDocElement = JSDocParagraph | JSDocTag;
export type JSDocInline = JSDocTag | JSDocLine;
export interface JSDocValue {
    /**
     * Represents the range that this JSDoc element occupies.
     * If the JSDoc was parsed from a `CstNode`, the range will represent the location in the source document.
     */
    readonly range: Range;
    /**
     * Renders this JSDoc element to a plain text representation.
     */
    toString(): string;
    /**
     * Renders this JSDoc element to a markdown representation.
     *
     * @param options Rendering options to customize the markdown result.
     */
    toMarkdown(options?: JSDocRenderOptions): string;
}
export interface JSDocParagraph extends JSDocValue {
    readonly inlines: JSDocInline[];
}
export interface JSDocLine extends JSDocValue {
    readonly text: string;
}
export interface JSDocTag extends JSDocValue {
    readonly name: string;
    readonly content: JSDocParagraph;
    readonly inline: boolean;
}
export interface JSDocParseOptions {
    /**
     * The start symbol of your comment format. Defaults to `/**`.
     */
    readonly start?: RegExp | string;
    /**
     * The symbol that start a line of your comment format. Defaults to `*`.
     */
    readonly line?: RegExp | string;
    /**
     * The end symbol of your comment format. Defaults to `*\/`.
     */
    readonly end?: RegExp | string;
}
export interface JSDocRenderOptions {
    /**
     * Determines the style for rendering tags. Defaults to `italic`.
     */
    tag?: 'plain' | 'italic' | 'bold' | 'bold-italic';
    /**
     * Determines the default for rendering `@link` tags. Defaults to `plain`.
     */
    link?: 'code' | 'plain';
    /**
     * Custom tag rendering function.
     * Return a markdown formatted tag or `undefined` to fall back to the default rendering.
     */
    renderTag?(tag: JSDocTag): string | undefined;
    /**
     * Custom link rendering function. Accepts a link target and a display value for the link.
     * Return a markdown formatted link with the format `[$display]($link)` or `undefined` if the link is not a valid target.
     */
    renderLink?(link: string, display: string): string | undefined;
}
/**
 * Parses a JSDoc from a `CstNode` containing a comment.
 *
 * @param node A `CstNode` from a parsed Langium document.
 * @param options Parsing options specialized to your language. See {@link JSDocParseOptions}.
 */
export declare function parseJSDoc(node: CstNode, options?: JSDocParseOptions): JSDocComment;
/**
 * Parses a JSDoc from a string comment.
 *
 * @param content A string containing the source of the JSDoc comment.
 * @param start The start position the comment occupies in the source document.
 * @param options Parsing options specialized to your language. See {@link JSDocParseOptions}.
 */
export declare function parseJSDoc(content: string, start?: Position, options?: JSDocParseOptions): JSDocComment;
export declare function isJSDoc(node: CstNode | string, options?: JSDocParseOptions): boolean;
//# sourceMappingURL=jsdoc.d.ts.map