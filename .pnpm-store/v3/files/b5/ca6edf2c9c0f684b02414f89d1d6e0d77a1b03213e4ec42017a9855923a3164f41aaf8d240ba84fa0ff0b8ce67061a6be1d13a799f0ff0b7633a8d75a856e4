import type { MermaidConfig } from '../../config.type.js';
import { FlowDB } from './flowDb.js';
export declare const diagram: {
    parser: any;
    readonly db: FlowDB;
    renderer: {
        getClasses: (text: string, diagramObj: any) => Map<string, import("../../diagram-api/types.js").DiagramStyleClassDef>;
        draw: (text: string, id: string, _version: string, diag: any) => Promise<void>;
    };
    styles: (options: import("./styles.js").FlowChartStyleOptions) => string;
    init: (cnf: MermaidConfig) => void;
};
