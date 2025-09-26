/**
 * Turn JSX in `tree` into function calls: `<x />` -> `h('x')`!
 *
 * ###### Algorithm
 *
 * In almost all cases, this utility is the same as the Babel plugin, except that
 * they work on slightly different syntax trees.
 *
 * Some differences:
 *
 * *   no pure annotations things
 * *   `this` is not a component: `<this>` -> `h('this')`, not `h(this)`
 * *   namespaces are supported: `<a:b c:d>` -> `h('a:b', {'c:d': true})`,
 *     which throws by default in Babel or can be turned on with `throwIfNamespace`
 * *   no `useSpread`, `useBuiltIns`, or `filter` options
 *
 * @param {Node} tree
 *   Tree to transform (typically `Program`).
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {undefined}
 *   Nothing.
 */
export function buildJsx(tree: Node, options?: Options | null | undefined): undefined;
export type Expression = import('estree-jsx').Expression;
export type Identifier = import('estree-jsx').Identifier;
export type ImportSpecifier = import('estree-jsx').ImportSpecifier;
export type JSXAttribute = import('estree-jsx').JSXAttribute;
export type JSXIdentifier = import('estree-jsx').JSXIdentifier;
export type JSXMemberExpression = import('estree-jsx').JSXMemberExpression;
export type JSXNamespacedName = import('estree-jsx').JSXNamespacedName;
export type Literal = import('estree-jsx').Literal;
export type MemberExpression = import('estree-jsx').MemberExpression;
export type Node = import('estree-jsx').Node;
export type ObjectExpression = import('estree-jsx').ObjectExpression;
export type Property = import('estree-jsx').Property;
export type SpreadElement = import('estree-jsx').SpreadElement;
/**
 * How to transform JSX.
 */
export type Runtime = 'automatic' | 'classic';
/**
 * Configuration.
 *
 * > 👉 **Note**: you can also configure `runtime`, `importSource`, `pragma`,
 * > and `pragmaFrag` from within files through comments.
 */
export type Options = {
    /**
     * Choose the runtime (default: `'classic'`).
     *
     * Comment form: `@jsxRuntime theRuntime`.
     */
    runtime?: Runtime | null | undefined;
    /**
     * Place to import `jsx`, `jsxs`, `jsxDEV`, and `Fragment` from, when the
     * effective runtime is automatic (default: `'react'`).
     *
     * Comment form: `@jsxImportSource theSource`.
     *
     * > 👉 **Note**: `/jsx-runtime` or `/jsx-dev-runtime` is appended to this
     * > provided source.
     * > In CJS, that can resolve to a file (as in `theSource/jsx-runtime.js`),
     * > but for ESM an export map needs to be set up to point to files:
     * >
     * > ```js
     * > // …
     * > "exports": {
     * >   // …
     * >   "./jsx-runtime": "./path/to/jsx-runtime.js",
     * >   "./jsx-dev-runtime": "./path/to/jsx-runtime.js"
     * >   // …
     * > ```
     */
    importSource?: string | null | undefined;
    /**
     * Identifier or member expression to call when the effective runtime is
     * classic (default: `'React.createElement'`).
     *
     * Comment form: `@jsx identifier`.
     */
    pragma?: string | null | undefined;
    /**
     * Identifier or member expression to use as a symbol for fragments when the
     * effective runtime is classic (default: `'React.Fragment'`).
     *
     * Comment form: `@jsxFrag identifier`.
     */
    pragmaFrag?: string | null | undefined;
    /**
     * When in the automatic runtime, whether to import
     * `theSource/jsx-dev-runtime.js`, use `jsxDEV`, and pass location info when
     * available (default: `false`).
     *
     * This helps debugging but adds a lot of code that you don’t want in
     * production.
     */
    development?: boolean | null | undefined;
    /**
     * File path to the original source file (optional).
     *
     * Passed in location info to `jsxDEV` when using the automatic runtime with
     * `development: true`.
     */
    filePath?: string | null | undefined;
};
/**
 * State where info from comments is gathered.
 */
export type Annotations = {
    /**
     * JSX identifier (`pragma`).
     */
    jsx?: string | undefined;
    /**
     * JSX identifier of fragment (`pragmaFrag`).
     */
    jsxFrag?: string | undefined;
    /**
     * Where to import an automatic JSX runtime from.
     */
    jsxImportSource?: string | undefined;
    /**
     * Runtime.
     */
    jsxRuntime?: Runtime | undefined;
};
/**
 * State of used identifiers from the automatic runtime.
 */
export type Imports = {
    /**
     * Symbol of `Fragment`.
     */
    fragment?: boolean | undefined;
    /**
     * Symbol of `jsx`.
     */
    jsx?: boolean | undefined;
    /**
     * Symbol of `jsxs`.
     */
    jsxs?: boolean | undefined;
    /**
     * Symbol of `jsxDEV`.
     */
    jsxDEV?: boolean | undefined;
};
