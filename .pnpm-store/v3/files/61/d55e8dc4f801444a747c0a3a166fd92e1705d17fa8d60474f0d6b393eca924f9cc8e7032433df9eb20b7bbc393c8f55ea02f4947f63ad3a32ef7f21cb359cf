/**
 * Accessibility (a11y) functions, types, helpers.
 *
 * @see https://www.w3.org/WAI/
 * @see https://www.w3.org/TR/wai-aria-1.1/
 * @see https://www.w3.org/TR/svg-aam-1.0/
 */
import type { D3Element } from './types.js';
/**
 * Add role and aria-roledescription to the svg element.
 *
 * @param svg - d3 object that contains the SVG HTML element
 * @param diagramType - diagram name for to the aria-roledescription
 */
export declare function setA11yDiagramInfo(svg: D3Element, diagramType: string): void;
/**
 * Add an accessible title and/or description element to a chart.
 * The title is usually not displayed and the description is never displayed.
 *
 * The following charts display their title as a visual and accessibility element: gantt.
 *
 * @param svg - d3 node to insert the a11y title and desc info
 * @param a11yTitle - a11y title. undefined or empty strings mean to skip them
 * @param a11yDesc - a11y description. undefined or empty strings mean to skip them
 * @param baseId - id used to construct the a11y title and description id
 */
export declare function addSVGa11yTitleDescription(svg: D3Element, a11yTitle: string | undefined, a11yDesc: string | undefined, baseId: string): void;
