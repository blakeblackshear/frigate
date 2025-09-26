import type { MermaidConfig } from './config.type.js';
import type { DiagramMetadata, DiagramStyleClassDef } from './diagram-api/types.js';
import { Diagram } from './Diagram.js';
import type { D3Element, ParseOptions, ParseResult, RenderResult } from './types.js';
/**
 * Parse the text and validate the syntax.
 * @param text - The mermaid diagram definition.
 * @param parseOptions - Options for parsing. @see {@link ParseOptions}
 * @returns An object with the `diagramType` set to type of the diagram if valid. Otherwise `false` if parseOptions.suppressErrors is `true`.
 * @throws Error if the diagram is invalid and parseOptions.suppressErrors is false or not set.
 */
declare function parse(text: string, parseOptions: ParseOptions & {
    suppressErrors: true;
}): Promise<ParseResult | false>;
declare function parse(text: string, parseOptions?: ParseOptions): Promise<ParseResult>;
/**
 * Create a CSS style that starts with the given class name, then the element,
 * with an enclosing block that has each of the cssClasses followed by !important;
 * @param cssClass - CSS class name
 * @param element - CSS element
 * @param cssClasses - list of CSS styles to append after the element
 * @returns - the constructed string
 */
export declare const cssImportantStyles: (cssClass: string, element: string, cssClasses?: string[]) => string;
/**
 * Create the user styles
 * @internal
 * @param  config - configuration that has style and theme settings to use
 * @param  classDefs - the classDefs in the diagram text. Might be null if none were defined. Usually is the result of a call to getClasses(...)
 * @returns  the string with all the user styles
 */
export declare const createCssStyles: (config: MermaidConfig, classDefs?: Map<string, DiagramStyleClassDef> | null | undefined) => string;
export declare const createUserStyles: (config: MermaidConfig, graphType: string, classDefs: Map<string, DiagramStyleClassDef> | undefined, svgId: string) => string;
/**
 * Clean up svgCode. Do replacements needed
 *
 * @param svgCode - the code to clean up
 * @param inSandboxMode - security level
 * @param useArrowMarkerUrls - should arrow marker's use full urls? (vs. just the anchors)
 * @returns the cleaned up svgCode
 */
export declare const cleanUpSvgCode: (svgCode: string | undefined, inSandboxMode: boolean, useArrowMarkerUrls: boolean) => string;
/**
 * Put the svgCode into an iFrame. Return the iFrame code
 *
 * @param svgCode - the svg code to put inside the iFrame
 * @param svgElement - the d3 node that has the current svgElement so we can get the height from it
 * @returns  - the code with the iFrame that now contains the svgCode
 */
export declare const putIntoIFrame: (svgCode?: string, svgElement?: D3Element) => string;
/**
 * Append an enclosing div, then svg, then g (group) to the d3 parentRoot. Set attributes.
 * Only set the style attribute on the enclosing div if divStyle is given.
 * Only set the xmlns:xlink attribute on svg if svgXlink is given.
 * Return the last node appended
 *
 * @param parentRoot - the d3 node to append things to
 * @param id - the value to set the id attr to
 * @param enclosingDivId - the id to set the enclosing div to
 * @param divStyle - if given, the style to set the enclosing div to
 * @param svgXlink - if given, the link to set the new svg element to
 * @returns - returns the parentRoot that had nodes appended
 */
export declare const appendDivSvgG: (parentRoot: D3Element, id: string, enclosingDivId: string, divStyle?: string, svgXlink?: string) => D3Element;
/**
 * Remove any existing elements from the given document
 *
 * @param doc - the document to removed elements from
 * @param id - id for any existing SVG element
 * @param divSelector - selector for any existing enclosing div element
 * @param iFrameSelector - selector for any existing iFrame element
 */
export declare const removeExistingElements: (doc: Document, id: string, divId: string, iFrameId: string) => void;
/**
 * @param  userOptions - Initial Mermaid options
 */
declare function initialize(userOptions?: MermaidConfig): void;
/**
 * @internal - Use mermaid.function instead of mermaid.mermaidAPI.function
 */
export declare const mermaidAPI: Readonly<{
    render: (id: string, text: string, svgContainingElement?: Element) => Promise<RenderResult>;
    parse: typeof parse;
    getDiagramFromText: (text: string, metadata?: Pick<DiagramMetadata, "title">) => Promise<Diagram>;
    initialize: typeof initialize;
    getConfig: () => MermaidConfig;
    setConfig: (conf: MermaidConfig) => MermaidConfig;
    getSiteConfig: () => MermaidConfig;
    updateSiteConfig: (conf: MermaidConfig) => MermaidConfig;
    reset: () => void;
    globalReset: () => void;
    defaultConfig: MermaidConfig;
}>;
export default mermaidAPI;
