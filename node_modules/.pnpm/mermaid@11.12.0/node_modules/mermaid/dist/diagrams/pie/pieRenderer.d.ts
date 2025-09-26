import type { DrawDefinition } from '../../diagram-api/types.js';
/**
 * Draws a Pie Chart with the data given in text.
 *
 * @param text - pie chart code
 * @param id - diagram id
 * @param _version - MermaidJS version from package.json.
 * @param diagObj - A standard diagram containing the DB and the text and type etc of the diagram.
 */
export declare const draw: DrawDefinition;
export declare const renderer: {
    draw: DrawDefinition;
};
