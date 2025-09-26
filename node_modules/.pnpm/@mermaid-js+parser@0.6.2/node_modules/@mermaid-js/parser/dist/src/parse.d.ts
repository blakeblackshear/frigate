import type { ParseResult } from 'langium';
import type { Info, Packet, Pie, Architecture, GitGraph, Radar, Treemap } from './index.js';
export type DiagramAST = Info | Packet | Pie | Architecture | GitGraph | Radar;
export declare function parse(diagramType: 'info', text: string): Promise<Info>;
export declare function parse(diagramType: 'packet', text: string): Promise<Packet>;
export declare function parse(diagramType: 'pie', text: string): Promise<Pie>;
export declare function parse(diagramType: 'architecture', text: string): Promise<Architecture>;
export declare function parse(diagramType: 'gitGraph', text: string): Promise<GitGraph>;
export declare function parse(diagramType: 'radar', text: string): Promise<Radar>;
export declare function parse(diagramType: 'treemap', text: string): Promise<Treemap>;
export declare class MermaidParseError extends Error {
    result: ParseResult<DiagramAST>;
    constructor(result: ParseResult<DiagramAST>);
}
