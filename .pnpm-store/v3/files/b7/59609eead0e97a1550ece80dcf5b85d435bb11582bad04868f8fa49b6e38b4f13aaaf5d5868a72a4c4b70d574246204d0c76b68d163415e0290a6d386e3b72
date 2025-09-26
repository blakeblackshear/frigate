/**
 * A plugin that rewrites JSX in functions to accept components as
 * `props.components` (when the function is called `_createMdxContent`), or from
 * a provider (if there is one).
 * It also makes sure that any undefined components are defined: either from
 * received components or as a function that throws an error.
 *
 * @param {Readonly<ProcessorOptions>} options
 *   Configuration (optional).
 * @returns
 *   Transform.
 */
export function recmaJsxRewrite(options: Readonly<ProcessorOptions>): (tree: Program, file: VFile) => undefined;
/**
 * Entry.
 */
export type StackEntry = {
    /**
     *   Used components.
     */
    components: Array<string>;
    /**
     *   Map of JSX identifiers which cannot be used as JS identifiers, to valid JS identifiers.
     */
    idToInvalidComponentName: Map<string, string>;
    /**
     *   Function.
     */
    node: Readonly<EstreeFunction>;
    /**
     *   Identifiers of used objects (such as `x` in `x.y`).
     */
    objects: Array<string>;
    /**
     *   Map of JSX identifiers for components and objects, to where they were first used.
     */
    references: Record<string, {
        node: Readonly<JSXElement>;
        component: boolean;
    }>;
    /**
     *   Tag names.
     */
    tags: Array<string>;
};
import type { ProcessorOptions } from '../core.js';
import type { Program } from 'estree-jsx';
import type { VFile } from 'vfile';
import type { Function as EstreeFunction } from 'estree-jsx';
import type { JSXElement } from 'estree-jsx';
//# sourceMappingURL=recma-jsx-rewrite.d.ts.map