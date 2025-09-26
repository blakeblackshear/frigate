/**
 * Create a state from options.
 *
 * @param {Options} options
 *   Configuration.
 * @returns {State}
 *   Info passed around about the current state.
 */
export function createState(options: Options): State;
/**
 * Specify casing to use for attribute names.
 *
 * HTML casing is for example `class`, `stroke-linecap`, `xml:lang`.
 * React casing is for example `className`, `strokeLinecap`, `xmlLang`.
 */
export type ElementAttributeNameCase = "html" | "react";
/**
 * Turn a hast node into an estree node.
 */
export type Handle = (node: any, state: State) => JsxElement | JsxExpressionContainer | JsxFragment | JsxSpreadChild | JsxText | null | undefined;
/**
 * Configuration.
 */
export type Options = {
    /**
     * Specify casing to use for attribute names (default: `'react'`).
     *
     * This casing is used for hast elements, not for embedded MDX JSX nodes
     * (components that someone authored manually).
     */
    elementAttributeNameCase?: ElementAttributeNameCase | null | undefined;
    /**
     * Custom handlers (optional).
     */
    handlers?: Record<string, Handle | null | undefined> | null | undefined;
    /**
     * Which space the document is in (default: `'html'`).
     *
     * When an `<svg>` element is found in the HTML space, this package already
     * automatically switches to and from the SVG space when entering and exiting
     * it.
     */
    space?: Space | null | undefined;
    /**
     * Specify casing to use for property names in `style` objects (default: `'dom'`).
     *
     * This casing is used for hast elements, not for embedded MDX JSX nodes
     * (components that someone authored manually).
     */
    stylePropertyNameCase?: StylePropertyNameCase | null | undefined;
    /**
     * Turn obsolete `align` props on `td` and `th` into CSS `style` props
     * (default: `true`).
     */
    tableCellAlignToStyle?: boolean | null | undefined;
};
/**
 * Namespace.
 */
export type Space = "html" | "svg";
/**
 * Casing to use for property names in `style` objects.
 *
 * CSS casing is for example `background-color` and `-webkit-line-clamp`.
 * DOM casing is for example `backgroundColor` and `WebkitLineClamp`.
 */
export type StylePropertyNameCase = "css" | "dom";
/**
 * Info passed around about the current state.
 */
export type State = {
    /**
     *   Transform children of a hast parent to estree.
     */
    all: (parent: HastParents) => Array<JsxElement | JsxExpressionContainer | JsxFragment | JsxSpreadChild | JsxText>;
    /**
     *   List of estree comments.
     */
    comments: Array<Comment>;
    /**
     *   Create a JSX attribute name.
     */
    createJsxAttributeName: (name: string) => JsxIdentifier | JsxNamespacedName;
    /**
     *   Create a JSX element name.
     */
    createJsxElementName: (name: string) => JsxIdentifier | JsxMemberExpression | JsxNamespacedName;
    /**
     *   Casing to use for attribute names.
     */
    elementAttributeNameCase: ElementAttributeNameCase;
    /**
     *   List of top-level estree nodes.
     */
    esm: Array<Directive | ModuleDeclaration | Statement>;
    /**
     *   Transform a hast node to estree.
     */
    handle: (node: any) => JsxElement | JsxExpressionContainer | JsxFragment | JsxSpreadChild | JsxText | null | undefined;
    /**
     *   Take positional info and data from `from` (use `patch` if you don’t want data).
     */
    inherit: (from: HastNodes | MdxJsxAttribute | MdxJsxAttributeValueExpression | MdxJsxExpressionAttribute, to: Comment | EstreeNode) => undefined;
    /**
     *   Take positional info from `from` (use `inherit` if you also want data).
     */
    patch: (from: HastNodes, to: Comment | EstreeNode) => undefined;
    /**
     *   Current schema.
     */
    schema: Schema;
    /**
     *   Casing to use for property names in `style` objects.
     */
    stylePropertyNameCase: StylePropertyNameCase;
    /**
     *   Turn obsolete `align` props on `td` and `th` into CSS `style` props.
     */
    tableCellAlignToStyle: boolean;
};
import type { JSXElement as JsxElement } from 'estree-jsx';
import type { JSXExpressionContainer as JsxExpressionContainer } from 'estree-jsx';
import type { JSXFragment as JsxFragment } from 'estree-jsx';
import type { JSXSpreadChild as JsxSpreadChild } from 'estree-jsx';
import type { JSXText as JsxText } from 'estree-jsx';
import type { Parents as HastParents } from 'hast';
import type { Comment } from 'estree';
import type { JSXIdentifier as JsxIdentifier } from 'estree-jsx';
import type { JSXNamespacedName as JsxNamespacedName } from 'estree-jsx';
import type { JSXMemberExpression as JsxMemberExpression } from 'estree-jsx';
import type { Directive } from 'estree';
import type { ModuleDeclaration } from 'estree';
import type { Statement } from 'estree';
import type { Nodes as HastNodes } from 'hast';
import type { MdxJsxAttribute } from 'mdast-util-mdx-jsx';
import type { MdxJsxAttributeValueExpression } from 'mdast-util-mdx-jsx';
import type { MdxJsxExpressionAttribute } from 'mdast-util-mdx-jsx';
import type { Node as EstreeNode } from 'estree';
import type { Schema } from 'property-information';
//# sourceMappingURL=state.d.ts.map