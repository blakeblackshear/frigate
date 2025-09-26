import { ObjAstNode } from './ast';
import { SymbolTable } from './types';
export declare class Import {
    readonly parent: Import | null;
    readonly symbols: SymbolTable;
    readonly offset: number;
    length: number;
    protected readonly byText: Map<string, number>;
    constructor(parent: Import | null, symbols: SymbolTable);
    getId(symbol: string): number | undefined;
    getText(id: number): string | undefined;
    add(symbol: string): number;
    toAst(): ObjAstNode;
}
