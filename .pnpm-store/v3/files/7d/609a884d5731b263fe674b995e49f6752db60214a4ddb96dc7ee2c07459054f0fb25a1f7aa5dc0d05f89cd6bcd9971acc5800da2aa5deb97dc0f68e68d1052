import * as graphlib from 'dagre-d3-es/src/graphlib/index.js';
import type { ClassRelation, ClassNote, ClassMap, NamespaceMap } from './classTypes.js';
/**
 * Function that adds the vertices found during parsing to the graph to be rendered.
 *
 * @param namespaces - Object containing the vertices.
 * @param g - The graph that is to be drawn.
 * @param _id - id of the graph
 * @param diagObj - The diagram object
 */
export declare const addNamespaces: (namespaces: NamespaceMap, g: graphlib.Graph, _id: string, diagObj: any) => void;
/**
 * Function that adds the vertices found during parsing to the graph to be rendered.
 *
 * @param classes - Object containing the vertices.
 * @param g - The graph that is to be drawn.
 * @param _id - id of the graph
 * @param diagObj - The diagram object
 * @param parent - id of the parent namespace, if it exists
 */
export declare const addClasses: (classes: ClassMap, g: graphlib.Graph, _id: string, diagObj: any, parent?: string) => void;
/**
 * Function that adds the additional vertices (notes) found during parsing to the graph to be rendered.
 *
 * @param notes - Object containing the additional vertices (notes).
 * @param g - The graph that is to be drawn.
 * @param startEdgeId - starting index for note edge
 * @param classes - Classes
 */
export declare const addNotes: (notes: ClassNote[], g: graphlib.Graph, startEdgeId: number, classes: ClassMap) => void;
/**
 * Add edges to graph based on parsed graph definition
 *
 * @param relations -
 * @param g - The graph object
 */
export declare const addRelations: (relations: ClassRelation[], g: graphlib.Graph) => void;
/**
 * Merges the value of `conf` with the passed `cnf`
 *
 * @param cnf - Config to merge
 */
export declare const setConf: (cnf: any) => void;
/**
 * Draws a class diagram in the tag with id: id based on the definition in text.
 *
 * @param text -
 * @param id -
 * @param _version -
 * @param diagObj -
 */
export declare const draw: (text: string, id: string, _version: string, diagObj: any) => Promise<void>;
declare const _default: {
    setConf: (cnf: any) => void;
    draw: (text: string, id: string, _version: string, diagObj: any) => Promise<void>;
};
export default _default;
