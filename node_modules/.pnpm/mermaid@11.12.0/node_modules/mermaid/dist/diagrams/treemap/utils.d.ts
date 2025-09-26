import type { TreemapNode } from './types.js';
/**
 * Converts a flat array of treemap items into a hierarchical structure
 * @param items - Array of flat treemap items with level, name, type, and optional value
 * @returns A hierarchical tree structure
 */
export declare function buildHierarchy(items: {
    level: number;
    name: string;
    type: string;
    value?: number;
    classSelector?: string;
    cssCompiledStyles?: string;
}[]): TreemapNode[];
