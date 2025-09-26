import type { DiagramStyleClassDef } from '../../diagram-api/types.js';
/**
 * Get the direction from the statement items.
 * Look through all of the documents (docs) in the parsedItems
 * Because is a _document_ direction, the default direction is not necessarily the same as the overall default _diagram_ direction.
 * @param parsedItem - the parsed statement item to look through
 * @param defaultDir - the direction to use if none is found
 * @returns The direction to use
 */
export declare const getDir: (parsedItem: any, defaultDir?: string) => string;
export declare const getClasses: (text: string, diagramObj: any) => Map<string, DiagramStyleClassDef>;
export declare const draw: (text: string, id: string, _version: string, diag: any) => Promise<void>;
declare const _default: {
    getClasses: (text: string, diagramObj: any) => Map<string, DiagramStyleClassDef>;
    draw: (text: string, id: string, _version: string, diag: any) => Promise<void>;
    getDir: (parsedItem: any, defaultDir?: string) => string;
};
export default _default;
