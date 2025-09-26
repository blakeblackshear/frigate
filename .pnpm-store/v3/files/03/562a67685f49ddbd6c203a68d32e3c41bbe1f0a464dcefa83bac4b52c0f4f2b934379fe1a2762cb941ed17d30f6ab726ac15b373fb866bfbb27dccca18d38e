import type { DetailedError } from './utils.js';
import type { DiagramDefinition, DiagramMetadata } from './diagram-api/types.js';
export type ParseErrorFunction = (err: string | DetailedError | unknown, hash?: any) => void;
/**
 * An object representing a parsed mermaid diagram definition.
 * @privateRemarks This is exported as part of the public mermaidAPI.
 */
export declare class Diagram {
    type: string;
    text: string;
    db: DiagramDefinition['db'];
    parser: DiagramDefinition['parser'];
    renderer: DiagramDefinition['renderer'];
    static fromText(text: string, metadata?: Pick<DiagramMetadata, 'title'>): Promise<Diagram>;
    private constructor();
    render(id: string, version: string): Promise<void>;
    getParser(): import("./diagram-api/types.js").ParserDefinition;
    getType(): string;
}
