import type { DiagramDB } from '../../diagram-api/types.js';
import type { Edge, Node } from '../../rendering-util/types.js';
import type { FlowClass, FlowEdge, FlowLink, FlowSubGraph, FlowText, FlowVertex, FlowVertexTypeParam } from './types.js';
export declare class FlowDB implements DiagramDB {
    private vertexCounter;
    private config;
    private vertices;
    private edges;
    private classes;
    private subGraphs;
    private subGraphLookup;
    private tooltips;
    private subCount;
    private firstGraphFlag;
    private direction;
    private version;
    private secCount;
    private posCrossRef;
    private funs;
    constructor();
    private sanitizeText;
    /**
     * Function to lookup domId from id in the graph definition.
     *
     * @param id - id of the node
     */
    lookUpDomId(id: string): string;
    /**
     * Function called by parser when a node definition has been found
     */
    addVertex(id: string, textObj: FlowText, type: FlowVertexTypeParam, style: string[], classes: string[], dir: string, props: {} | undefined, metadata: any): void;
    /**
     * Function called by parser when a link/edge definition has been found
     *
     */
    addSingleLink(_start: string, _end: string, type: any, id?: string): void;
    private isLinkData;
    addLink(_start: string[], _end: string[], linkData: unknown): void;
    /**
     * Updates a link's line interpolation algorithm
     */
    updateLinkInterpolate(positions: ('default' | number)[], interpolate: string): void;
    /**
     * Updates a link with a style
     *
     */
    updateLink(positions: ('default' | number)[], style: string[]): void;
    addClass(ids: string, _style: string[]): void;
    /**
     * Called by parser when a graph definition is found, stores the direction of the chart.
     *
     */
    setDirection(dir: string): void;
    /**
     * Called by parser when a special node is found, e.g. a clickable element.
     *
     * @param ids - Comma separated list of ids
     * @param className - Class to add
     */
    setClass(ids: string, className: string): void;
    setTooltip(ids: string, tooltip: string): void;
    private setClickFun;
    /**
     * Called by parser when a link is found. Adds the URL to the vertex data.
     *
     * @param ids - Comma separated list of ids
     * @param linkStr - URL to create a link for
     * @param target - Target attribute for the link
     */
    setLink(ids: string, linkStr: string, target: string): void;
    getTooltip(id: string): string | undefined;
    /**
     * Called by parser when a click definition is found. Registers an event handler.
     *
     * @param ids - Comma separated list of ids
     * @param functionName - Function to be called on click
     * @param functionArgs - Arguments to be passed to the function
     */
    setClickEvent(ids: string, functionName: string, functionArgs: string): void;
    bindFunctions(element: Element): void;
    getDirection(): string | undefined;
    /**
     * Retrieval function for fetching the found nodes after parsing has completed.
     *
     */
    getVertices(): Map<string, FlowVertex>;
    /**
     * Retrieval function for fetching the found links after parsing has completed.
     *
     */
    getEdges(): FlowEdge[] & {
        defaultInterpolate?: string;
        defaultStyle?: string[];
    };
    /**
     * Retrieval function for fetching the found class definitions after parsing has completed.
     *
     */
    getClasses(): Map<string, FlowClass>;
    private setupToolTips;
    /**
     * Clears the internal graph db so that a new graph can be parsed.
     *
     */
    clear(ver?: string): void;
    setGen(ver: string): void;
    defaultStyle(): string;
    addSubGraph(_id: {
        text: string;
    }, list: string[], _title: {
        text: string;
        type: string;
    }): string;
    private getPosForId;
    private indexNodes2;
    getDepthFirstPos(pos: number): number;
    indexNodes(): void;
    getSubGraphs(): FlowSubGraph[];
    firstGraph(): boolean;
    private destructStartLink;
    private countChar;
    private destructEndLink;
    destructLink(_str: string, _startStr: string): FlowLink | {
        type: string;
        stroke: string;
        length: number;
    };
    exists(allSgs: FlowSubGraph[], _id: string): boolean;
    /**
     * Deletes an id from all subgraphs
     *
     */
    makeUniq(sg: FlowSubGraph, allSubgraphs: FlowSubGraph[]): {
        nodes: string[];
    };
    lex: {
        firstGraph: typeof FlowDB.prototype.firstGraph;
    };
    private getTypeFromVertex;
    private findNode;
    private destructEdgeType;
    private addNodeFromVertex;
    private getCompiledStyles;
    getData(): {
        nodes: Node[];
        edges: Edge[];
        other: {};
        config: import("../../config.type.js").MermaidConfig;
    };
    defaultConfig(): import("../../config.type.js").FlowchartDiagramConfig | undefined;
    setAccTitle: (txt: string) => void;
    setAccDescription: (txt: string) => void;
    setDiagramTitle: (txt: string) => void;
    getAccTitle: () => string;
    getAccDescription: () => string;
    getDiagramTitle: () => string;
}
