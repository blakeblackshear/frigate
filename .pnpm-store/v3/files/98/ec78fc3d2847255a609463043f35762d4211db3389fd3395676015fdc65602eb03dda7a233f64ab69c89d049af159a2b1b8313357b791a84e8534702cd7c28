import { type Selection } from 'd3';
export declare const convert: (template: TemplateStringsArray, ...params: unknown[]) => {
    [k: string]: unknown;
}[];
export declare const MOCKED_BBOX: {
    x: number;
    y: number;
    width: number;
    height: number;
};
interface JsdomItInput {
    body: Selection<HTMLBodyElement, never, HTMLElement, any>;
    svg: Selection<SVGSVGElement, never, HTMLElement, any>;
}
/**
 * Test method borrowed from d3 : https://github.com/d3/d3-selection/blob/v3.0.0/test/jsdom.js
 *
 * Fools d3 into thinking it's working in a browser with a real DOM.
 *
 * The DOM is actually an instance of JSDom with monkey-patches for DOM methods that require a
 * rendering engine.
 *
 * The resulting environment is capable of rendering SVGs with the caveat that layouts are
 * completely screwed.
 *
 * This makes it possible to make structural tests instead of mocking everything.
 */
export declare function jsdomIt(message: string, run: (input: JsdomItInput) => void | Promise<void>): void;
/**
 * Retrieves the node from its parent with ParentNode#querySelector,
 * then checks that it exists before returning it.
 */
export declare function ensureNodeFromSelector(selector: string, parent?: ParentNode): Element;
export {};
