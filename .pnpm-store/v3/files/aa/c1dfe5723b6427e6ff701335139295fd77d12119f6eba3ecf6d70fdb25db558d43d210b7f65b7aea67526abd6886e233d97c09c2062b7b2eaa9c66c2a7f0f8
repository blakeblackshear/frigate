import type { MermaidConfig } from '../../config.type.js';
import type { Edge, NodeData, StateStmt, StyleClass } from './stateDb.js';
/**
 * Create a standard string for the dom ID of an item.
 * If a type is given, insert that before the counter, preceded by the type spacer
 *
 */
export declare function stateDomId(itemId?: string, counter?: number, type?: string | null, typeSpacer?: string): string;
export declare const dataFetcher: (parent: StateStmt | undefined, parsedItem: StateStmt, diagramStates: Map<string, StateStmt>, nodes: NodeData[], edges: Edge[], altFlag: boolean, look: MermaidConfig["look"], classes: Map<string, StyleClass>) => void;
export declare const reset: () => void;
