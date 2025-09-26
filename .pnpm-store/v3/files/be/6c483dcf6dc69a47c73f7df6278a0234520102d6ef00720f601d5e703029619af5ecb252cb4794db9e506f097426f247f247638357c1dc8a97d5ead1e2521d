import type { GanttDiagramConfig, MermaidConfig } from '../config.type.js';
interface FrontMatterMetadata {
    title?: string;
    displayMode?: GanttDiagramConfig['displayMode'];
    config?: MermaidConfig;
}
export interface FrontMatterResult {
    text: string;
    metadata: FrontMatterMetadata;
}
/**
 * Extract and parse frontmatter from text, if present, and sets appropriate
 * properties in the provided db.
 * @param text - The text that may have a YAML frontmatter.
 * @returns text with frontmatter stripped out
 */
export declare function extractFrontMatter(text: string): FrontMatterResult;
export {};
