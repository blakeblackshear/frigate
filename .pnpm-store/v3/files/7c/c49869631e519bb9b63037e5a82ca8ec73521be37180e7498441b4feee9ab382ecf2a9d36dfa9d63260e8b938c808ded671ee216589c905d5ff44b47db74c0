/**
 * Web page integration module for the mermaid framework. It uses the mermaidAPI for mermaid
 * functionality and to render the diagrams to svg code!
 */
import { registerIconPacks } from './rendering-util/icons.js';
import type { MermaidConfig } from './config.type.js';
import { detectType } from './diagram-api/detectType.js';
import type { ExternalDiagramDefinition, SVG, SVGGroup } from './diagram-api/types.js';
import type { ParseErrorFunction } from './Diagram.js';
import type { UnknownDiagramError } from './errors.js';
import type { InternalHelpers } from './internals.js';
import { mermaidAPI } from './mermaidAPI.js';
import type { LayoutLoaderDefinition, RenderOptions } from './rendering-util/render.js';
import { registerLayoutLoaders } from './rendering-util/render.js';
import type { LayoutData } from './rendering-util/types.js';
import type { ParseOptions, ParseResult, RenderResult } from './types.js';
import type { DetailedError } from './utils.js';
export type { DetailedError, ExternalDiagramDefinition, InternalHelpers, LayoutData, LayoutLoaderDefinition, MermaidConfig, ParseErrorFunction, ParseOptions, ParseResult, RenderOptions, RenderResult, SVG, SVGGroup, UnknownDiagramError, };
export interface RunOptions {
    /**
     * The query selector to use when finding elements to render. Default: `".mermaid"`.
     */
    querySelector?: string;
    /**
     * The nodes to render. If this is set, `querySelector` will be ignored.
     */
    nodes?: ArrayLike<HTMLElement>;
    /**
     * A callback to call after each diagram is rendered.
     */
    postRenderCallback?: (id: string) => unknown;
    /**
     * If `true`, errors will be logged to the console, but not thrown. Default: `false`
     */
    suppressErrors?: boolean;
}
/**
 * ## run
 *
 * Function that goes through the document to find the chart definitions in there and render them.
 *
 * The function tags the processed attributes with the attribute data-processed and ignores found
 * elements with the attribute already set. This way the init function can be triggered several
 * times.
 *
 * ```mermaid
 * graph LR;
 *  a(Find elements)-->b{Processed}
 *  b-->|Yes|c(Leave element)
 *  b-->|No |d(Transform)
 * ```
 *
 * Renders the mermaid diagrams
 *
 * @param options - Optional runtime configs
 */
declare const run: (options?: RunOptions) => Promise<void>;
/**
 * Used to set configurations for mermaid.
 * This function should be called before the run function.
 * @param config - Configuration object for mermaid.
 */
declare const initialize: (config: MermaidConfig) => void;
/**
 * ## init
 *
 * @deprecated Use {@link initialize} and {@link run} instead.
 *
 * Renders the mermaid diagrams
 *
 * @param config - **Deprecated**, please set configuration in {@link initialize}.
 * @param nodes - **Default**: `.mermaid`. One of the following:
 * - A DOM Node
 * - An array of DOM nodes (as would come from a jQuery selector)
 * - A W3C selector, a la `.mermaid`
 * @param callback - Called once for each rendered diagram's id.
 */
declare const init: (config?: MermaidConfig, nodes?: string | HTMLElement | NodeListOf<HTMLElement>, callback?: (id: string) => unknown) => Promise<void>;
/**
 * Used to register external diagram types.
 * @param diagrams - Array of {@link ExternalDiagramDefinition}.
 * @param opts - If opts.lazyLoad is false, the diagrams will be loaded immediately.
 */
declare const registerExternalDiagrams: (diagrams: ExternalDiagramDefinition[], { lazyLoad, }?: {
    lazyLoad?: boolean;
}) => Promise<void>;
/**
 * ##contentLoaded Callback function that is called when page is loaded. This functions fetches
 * configuration for mermaid rendering and calls init for rendering the mermaid diagrams on the
 * page.
 */
declare const contentLoaded: () => void;
/**
 * ## setParseErrorHandler  Alternative to directly setting parseError using:
 *
 * ```js
 * mermaid.parseError = function(err,hash) {
 *   forExampleDisplayErrorInGui(err);  // do something with the error
 * };
 * ```
 *
 * This is provided for environments where the mermaid object can't directly have a new member added
 * to it (eg. dart interop wrapper). (Initially there is no parseError member of mermaid).
 *
 * @param parseErrorHandler - New parseError() callback.
 */
declare const setParseErrorHandler: (parseErrorHandler: (err: any, hash: any) => void) => void;
/**
 * Parse the text and validate the syntax.
 * @param text - The mermaid diagram definition.
 * @param parseOptions - Options for parsing. @see {@link ParseOptions}
 * @returns If valid, {@link ParseResult} otherwise `false` if parseOptions.suppressErrors is `true`.
 * @throws Error if the diagram is invalid and parseOptions.suppressErrors is false or not set.
 *
 * @example
 * ```js
 * console.log(await mermaid.parse('flowchart \n a --> b'));
 * // { diagramType: 'flowchart-v2' }
 * console.log(await mermaid.parse('wrong \n a --> b', { suppressErrors: true }));
 * // false
 * console.log(await mermaid.parse('wrong \n a --> b', { suppressErrors: false }));
 * // throws Error
 * console.log(await mermaid.parse('wrong \n a --> b'));
 * // throws Error
 * ```
 */
declare const parse: typeof mermaidAPI.parse;
/**
 * Function that renders an SVG with a graph from a chart definition. Usage example below.
 *
 * ```javascript
 *  element = document.querySelector('#graphDiv');
 *  const graphDefinition = 'graph TB\na-->b';
 *  const { svg, bindFunctions } = await mermaid.render('graphDiv', graphDefinition);
 *  element.innerHTML = svg;
 *  bindFunctions?.(element);
 * ```
 *
 * @remarks
 * Multiple calls to this function will be enqueued to run serially.
 *
 * @param id - The id for the SVG element (the element to be rendered)
 * @param text - The text for the graph definition
 * @param container - HTML element where the svg will be inserted. (Is usually element with the .mermaid class)
 *   If no svgContainingElement is provided then the SVG element will be appended to the body.
 *    Selector to element in which a div with the graph temporarily will be
 *   inserted. If one is provided a hidden div will be inserted in the body of the page instead. The
 *   element will be removed when rendering is completed.
 * @returns Returns the SVG Definition and BindFunctions.
 */
declare const render: typeof mermaidAPI.render;
/**
 * Gets the metadata for all registered diagrams.
 * Currently only the id is returned.
 * @returns An array of objects with the id of the diagram.
 */
declare const getRegisteredDiagramsMetadata: () => Pick<ExternalDiagramDefinition, "id">[];
export interface Mermaid {
    startOnLoad: boolean;
    parseError?: ParseErrorFunction;
    /**
     * @deprecated Use {@link parse} and {@link render} instead. Please [open a discussion](https://github.com/mermaid-js/mermaid/discussions) if your use case does not fit the new API.
     * @internal
     */
    mermaidAPI: typeof mermaidAPI;
    parse: typeof parse;
    render: typeof render;
    /**
     * @deprecated Use {@link initialize} and {@link run} instead.
     */
    init: typeof init;
    run: typeof run;
    registerLayoutLoaders: typeof registerLayoutLoaders;
    registerExternalDiagrams: typeof registerExternalDiagrams;
    initialize: typeof initialize;
    contentLoaded: typeof contentLoaded;
    setParseErrorHandler: typeof setParseErrorHandler;
    detectType: typeof detectType;
    registerIconPacks: typeof registerIconPacks;
    getRegisteredDiagramsMetadata: typeof getRegisteredDiagramsMetadata;
}
declare const mermaid: Mermaid;
export default mermaid;
