import type { D3Element } from '../../types.js';
import type { Edge, KanbanNode } from '../../rendering-util/types.js';
declare const db: {
    readonly clear: () => void;
    readonly addNode: (level: number, id: string, descr: string, type: number, shapeData: string) => void;
    readonly getSections: () => KanbanNode[];
    readonly getData: () => {
        nodes: KanbanNode[];
        edges: Edge[];
        other: {};
        config: import("../../config.type.js").MermaidConfig;
    };
    readonly nodeType: {
        DEFAULT: number;
        NO_BORDER: number;
        ROUNDED_RECT: number;
        RECT: number;
        CIRCLE: number;
        CLOUD: number;
        BANG: number;
        HEXAGON: number;
    };
    readonly getType: (startStr: string, endStr: string) => number;
    readonly setElementForId: (id: number, element: D3Element) => void;
    readonly decorateNode: (decoration?: {
        class?: string;
        icon?: string;
    }) => void;
    readonly type2Str: (type: number) => "rect" | "circle" | "bang" | "cloud" | "no-border" | "rounded-rect" | "hexgon";
    readonly getLogger: () => Record<import("../../logger.js").LogLevel, {
        (...data: any[]): void;
        (message?: any, ...optionalParams: any[]): void;
    }>;
    readonly getElementById: (id: number) => any;
};
export default db;
