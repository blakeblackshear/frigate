import type { MermaidConfig } from '../../../config.type.js';
import type { LayoutData } from '../../types.js';
import type { LayoutResult } from './types.js';
/**
 * Execute the cose-bilkent layout algorithm on generic layout data
 *
 * This function takes layout data and uses Cytoscape with the cose-bilkent
 * algorithm to calculate optimal node positions and edge paths.
 *
 * @param data - The layout data containing nodes, edges, and configuration
 * @param config - Mermaid configuration object
 * @returns Promise resolving to layout result with positioned nodes and edges
 */
export declare function executeCoseBilkentLayout(data: LayoutData, _config: MermaidConfig): Promise<LayoutResult>;
/**
 * Validate layout data structure
 * @param data - The data to validate
 * @returns True if data is valid, throws error otherwise
 */
export declare function validateLayoutData(data: LayoutData): boolean;
