import type { BaseType, CurveFactory } from 'd3';
import type { MermaidConfig } from './config.type.js';
import type { D3Element, Point, TextDimensionConfig, TextDimensions } from './types.js';
export declare const ZERO_WIDTH_SPACE = "\u200B";
/**
 * Detects the init config object from the text
 *
 * @param text - The text defining the graph. For example:
 *
 * ```mermaid
 * %%{init: {"theme": "debug", "logLevel": 1 }}%%
 * graph LR
 *      a-->b
 *      b-->c
 *      c-->d
 *      d-->e
 *      e-->f
 *      f-->g
 *      g-->h
 * ```
 *
 * Or
 *
 * ```mermaid
 * %%{initialize: {"theme": "dark", logLevel: "debug" }}%%
 * graph LR
 *    a-->b
 *    b-->c
 *    c-->d
 *    d-->e
 *    e-->f
 *    f-->g
 *    g-->h
 * ```
 *
 * @param config - Optional mermaid configuration object.
 * @returns The json object representing the init passed to mermaid.initialize()
 */
export declare const detectInit: (text: string, config?: MermaidConfig) => MermaidConfig | undefined;
interface Directive {
    type?: string;
    args?: unknown;
}
/**
 * Detects the directive from the text.
 *
 * Text can be single line or multiline. If type is null or omitted,
 * the first directive encountered in text will be returned
 *
 * ```mermaid
 * graph LR
 * %%{someDirective}%%
 *    a-->b
 *    b-->c
 *    c-->d
 *    d-->e
 *    e-->f
 *    f-->g
 *    g-->h
 * ```
 *
 * @param text - The text defining the graph
 * @param type - The directive to return (default: `null`)
 * @returns An object or Array representing the directive(s) matched by the input type.
 * If a single directive was found, that directive object will be returned.
 */
export declare const detectDirective: (text: string, type?: string | RegExp | null) => Directive | Directive[];
export declare const removeDirectives: (text: string) => string;
/**
 * Detects whether a substring in present in a given array
 *
 * @param str - The substring to detect
 * @param arr - The array to search
 * @returns The array index containing the substring or -1 if not present
 */
export declare const isSubstringInArray: (str: string, arr: string[]) => number;
/**
 * Returns a d3 curve given a curve name
 *
 * @param interpolate - The interpolation name
 * @param defaultCurve - The default curve to return
 * @returns The curve factory to use
 */
export declare function interpolateToCurve(interpolate: string | undefined, defaultCurve: CurveFactory): CurveFactory;
/**
 * Formats a URL string
 *
 * @param linkStr - String of the URL
 * @param config - Configuration passed to MermaidJS
 * @returns The formatted URL or `undefined`.
 */
export declare function formatUrl(linkStr: string, config: MermaidConfig): string | undefined;
/**
 * Runs a function
 *
 * @param functionName - A dot separated path to the function relative to the `window`
 * @param params - Parameters to pass to the function
 */
export declare const runFunc: (functionName: string, ...params: unknown[]) => void;
/**
 * {@inheritdoc traverseEdge}
 */
declare function calcLabelPosition(points: Point[]): Point;
export declare const roundNumber: (num: number, precision?: number) => number;
export declare const calculatePoint: (points: Point[], distanceToTraverse: number) => Point;
/**
 * Calculates the terminal label position.
 *
 * @param terminalMarkerSize - Terminal marker size.
 * @param position - Position of label relative to points.
 * @param _points - Array of points.
 * @returns - The `cardinalityPosition`.
 */
declare function calcTerminalLabelPosition(terminalMarkerSize: number, position: 'start_left' | 'start_right' | 'end_left' | 'end_right', _points: Point[]): Point;
/**
 * Gets styles from an array of declarations
 *
 * @param arr - Declarations
 * @returns The styles grouped as strings
 */
export declare function getStylesFromArray(arr: string[]): {
    style: string;
    labelStyle: string;
};
export declare const generateId: () => string;
export declare const random: (options: {
    length: number;
}) => string;
export declare const getTextObj: () => {
    x: number;
    y: number;
    fill: undefined;
    anchor: string;
    style: string;
    width: number;
    height: number;
    textMargin: number;
    rx: number;
    ry: number;
    valign: undefined;
    text: string;
};
/**
 * Adds text to an element
 *
 * @param elem - SVG Element to add text to
 * @param textData - Text options.
 * @returns Text element with given styling and content
 */
export declare const drawSimpleText: (elem: SVGElement, textData: {
    text: string;
    x: number;
    y: number;
    anchor: "start" | "middle" | "end";
    fontFamily: string;
    fontSize: string | number;
    fontWeight: string | number;
    fill: string;
    class: string | undefined;
    textMargin: number;
}) => SVGTextElement;
interface WrapLabelConfig {
    fontSize: number;
    fontFamily: string;
    fontWeight: number;
    joinWith: string;
}
export declare const wrapLabel: (label: string, maxWidth: number, config: WrapLabelConfig) => string;
/**
 * This calculates the text's height, taking into account the wrap breaks and both the statically
 * configured height, width, and the length of the text (in pixels).
 *
 * If the wrapped text has greater height, we extend the height, so it's value won't overflow.
 *
 * @param text - The text to measure
 * @param config - The config for fontSize, fontFamily, and fontWeight all impacting the
 *   resulting size
 * @returns The height for the given text
 */
export declare function calculateTextHeight(text: Parameters<typeof calculateTextDimensions>[0], config: Parameters<typeof calculateTextDimensions>[1]): ReturnType<typeof calculateTextDimensions>['height'];
/**
 * This calculates the width of the given text, font size and family.
 *
 * @param text - The text to calculate the width of
 * @param config - The config for fontSize, fontFamily, and fontWeight all impacting the
 *   resulting size
 * @returns The width for the given text
 */
export declare function calculateTextWidth(text: Parameters<typeof calculateTextDimensions>[0], config: Parameters<typeof calculateTextDimensions>[1]): ReturnType<typeof calculateTextDimensions>['width'];
/**
 * This calculates the dimensions of the given text, font size, font family, font weight, and
 * margins.
 *
 * @param text - The text to calculate the width of
 * @param config - The config for fontSize, fontFamily, fontWeight, and margin all impacting
 *   the resulting size
 * @returns The dimensions for the given text
 */
export declare const calculateTextDimensions: (text: string, config: TextDimensionConfig) => TextDimensions;
export declare class InitIDGenerator {
    private count;
    next: () => number;
    constructor(deterministic?: boolean, seed?: string);
}
/**
 * Decodes HTML, source: {@link https://github.com/shrpne/entity-decode/blob/v2.0.1/browser.js}
 *
 * @param html - HTML as a string
 * @returns Unescaped HTML
 */
export declare const entityDecode: (html: string) => string;
export interface DetailedError {
    str: string;
    hash: any;
    error?: any;
    message?: string;
}
/** @param error - The error to check */
export declare function isDetailedError(error: any): error is DetailedError;
/** @param error - The error to convert to an error message */
export declare function getErrorMessage(error: unknown): string;
/**
 * Appends <text> element with the given title and css class.
 *
 * @param parent - d3 svg object to append title to
 * @param cssClass - CSS class for the <text> element containing the title
 * @param titleTopMargin - Margin in pixels between title and rest of the graph
 * @param title - The title. If empty, returns immediately.
 */
export declare const insertTitle: (parent: D3Element, cssClass: string, titleTopMargin: number, title?: string) => void;
/**
 * Parses a raw fontSize configuration value into a number and string value.
 *
 * @param fontSize - a string or number font size configuration value
 *
 * @returns parsed number and string style font size values, or nulls if a number value can't
 * be parsed from an input string.
 */
export declare const parseFontSize: (fontSize: string | number | undefined) => [number?, string?];
export declare function cleanAndMerge<T>(defaultData: T, data?: Partial<T>): T;
declare const _default: {
    assignWithDepth: (dst: any, src: any, { depth, clobber }?: {
        depth?: number;
        clobber?: boolean;
    }) => any;
    wrapLabel: (label: string, maxWidth: number, config: WrapLabelConfig) => string;
    calculateTextHeight: typeof calculateTextHeight;
    calculateTextWidth: typeof calculateTextWidth;
    calculateTextDimensions: (text: string, config: TextDimensionConfig) => TextDimensions;
    cleanAndMerge: typeof cleanAndMerge;
    detectInit: (text: string, config?: MermaidConfig) => MermaidConfig | undefined;
    detectDirective: (text: string, type?: string | RegExp | null) => Directive | Directive[];
    isSubstringInArray: (str: string, arr: string[]) => number;
    interpolateToCurve: typeof interpolateToCurve;
    calcLabelPosition: typeof calcLabelPosition;
    calcCardinalityPosition: (isRelationTypePresent: boolean, points: Point[], initialPosition: Point) => {
        x: number;
        y: number;
    };
    calcTerminalLabelPosition: typeof calcTerminalLabelPosition;
    formatUrl: typeof formatUrl;
    getStylesFromArray: typeof getStylesFromArray;
    generateId: () => string;
    random: (options: {
        length: number;
    }) => string;
    runFunc: (functionName: string, ...params: unknown[]) => void;
    entityDecode: (html: string) => string;
    insertTitle: (parent: D3Element, cssClass: string, titleTopMargin: number, title?: string) => void;
    isLabelCoordinateInPath: typeof isLabelCoordinateInPath;
    parseFontSize: (fontSize: string | number | undefined) => [number?, string?];
    InitIDGenerator: typeof InitIDGenerator;
};
export default _default;
/**
 * @param  text - text to be encoded
 * @returns
 */
export declare const encodeEntities: (text: string) => string;
/**
 *
 * @param  text - text to be decoded
 * @returns
 */
export declare const decodeEntities: (text: string) => string;
export declare const isString: (value: unknown) => value is string;
export declare const getEdgeId: (from: string, to: string, { counter, prefix, suffix, }: {
    counter?: number;
    prefix?: string;
    suffix?: string;
}, id?: string) => string;
/**
 * D3's `selection.attr` method doesn't officially support `undefined`.
 *
 * However, it seems if you do pass `undefined`, it seems to be treated as `null`
 * (e.g. it removes the attribute).
 */
export declare function handleUndefinedAttr(attrValue: Parameters<d3.Selection<BaseType, unknown, HTMLElement, any>['attr']>[1] | undefined): string | number | boolean | readonly (string | number)[] | import("d3-selection").ValueFn<BaseType, unknown, string | number | boolean | readonly (string | number)[] | null> | null;
/**
 * Checks if the  x or y coordinate of the edge label
 * appears in the given SVG path data string.
 *
 * @param point  - The Point object with x and y properties to check.
 * @param dAttr  - SVG path data string (the 'd' attribute of an SVG path element).
 * @returns      - True if the rounded x or y coordinate of the edge label is found
 *                 in the sanitized path data string; otherwise, false.
 */
export declare function isLabelCoordinateInPath(point: Point, dAttr: string): boolean;
