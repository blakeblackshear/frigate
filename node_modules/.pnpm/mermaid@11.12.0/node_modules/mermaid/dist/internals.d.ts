import { insertNode } from './rendering-util/rendering-elements/nodes.js';
import { interpolateToCurve } from './utils.js';
/**
 * Internal helpers for mermaid
 * @deprecated - This should not be used by external packages, as the definitions will change without notice.
 */
export declare const internalHelpers: {
    common: {
        getRows: (s?: string) => string[];
        sanitizeText: (text: string, config: import("./config.type.js").MermaidConfig) => string;
        sanitizeTextOrArray: (a: string | string[] | string[][], config: import("./config.type.js").MermaidConfig) => string | string[];
        hasBreaks: (text: string) => boolean;
        splitBreaks: (text: string) => string[];
        lineBreakRegex: RegExp;
        removeScript: (txt: string) => string;
        getUrl: (useAbsolute: boolean) => string;
        evaluate: (val?: string | boolean) => boolean;
        getMax: (...values: number[]) => number;
        getMin: (...values: number[]) => number;
    };
    getConfig: () => import("./config.type.js").MermaidConfig;
    insertCluster: (elem: any, node: import("./rendering-util/types.js").ClusterNode) => Promise<any>;
    insertEdge: (elem: any, edge: any, clusterDb: any, diagramType: any, startNode: any, endNode: any, id: any, skipIntersect?: boolean) => {
        updatedPath: any;
        originalPath: any;
    };
    insertEdgeLabel: (elem: any, edge: any) => Promise<any>;
    insertMarkers: (elem: any, markerArray: any, type: any, id: any) => void;
    insertNode: typeof insertNode;
    interpolateToCurve: typeof interpolateToCurve;
    labelHelper: <T extends SVGGraphicsElement>(parent: import("./types.js").D3Selection<T>, node: import("./rendering-util/types.js").Node, _classes?: string) => Promise<{
        shapeSvg: import("d3-selection").Selection<SVGGElement, unknown, Element | null, unknown>;
        bbox: any;
        halfPadding: number;
        label: import("d3-selection").Selection<SVGGElement, unknown, Element | null, unknown>;
    }>;
    log: Record<import("./logger.js").LogLevel, {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    }>;
    positionEdgeLabel: (edge: any, paths: any) => void;
};
export type InternalHelpers = typeof internalHelpers;
