import type { DiagramStyleClassDef } from '../../diagram-api/types.js';
export declare const getClasses: (text: string, diagramObj: any) => Map<string, DiagramStyleClassDef>;
export declare const draw: (text: string, id: string, _version: string, diag: any) => Promise<void>;
declare const _default: {
    getClasses: (text: string, diagramObj: any) => Map<string, DiagramStyleClassDef>;
    draw: (text: string, id: string, _version: string, diag: any) => Promise<void>;
};
export default _default;
