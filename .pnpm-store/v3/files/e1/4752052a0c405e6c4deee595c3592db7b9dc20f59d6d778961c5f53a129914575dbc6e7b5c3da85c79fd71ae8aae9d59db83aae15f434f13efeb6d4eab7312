import { Import } from './Import';
export interface AstNode<T> {
    readonly val: T;
    readonly len: number;
    byteLength(): number;
}
export declare class NullAstNode implements AstNode<null> {
    readonly val: null;
    readonly len = 1;
    byteLength(): number;
}
export declare class BoolAstNode implements AstNode<boolean> {
    readonly val: boolean;
    readonly len = 1;
    constructor(val: boolean);
    byteLength(): number;
}
export declare class UintAstNode implements AstNode<number> {
    readonly val: number;
    readonly len: number;
    constructor(val: number);
    byteLength(): number;
}
export declare class NintAstNode implements AstNode<number> {
    readonly val: number;
    readonly len: number;
    constructor(val: number);
    byteLength(): number;
}
export declare class FloatAstNode implements AstNode<number> {
    readonly val: number;
    readonly len: number;
    constructor(val: number);
    byteLength(): number;
}
export declare class StrAstNode implements AstNode<string> {
    readonly val: string;
    readonly len: number;
    constructor(val: string);
    byteLength(): number;
}
export declare class BinAstNode implements AstNode<Uint8Array> {
    readonly val: Uint8Array;
    readonly len: number;
    constructor(val: Uint8Array);
    byteLength(): number;
}
export declare class ArrAstNode implements AstNode<AstNode<unknown>[] | null> {
    readonly val: AstNode<unknown>[] | null;
    readonly len: number;
    constructor(val: AstNode<unknown>[] | null);
    byteLength(): number;
}
export declare class ObjAstNode implements AstNode<Map<number, AstNode<unknown>> | null> {
    readonly val: Map<number, AstNode<unknown>> | null;
    readonly len: number;
    constructor(val: Map<number, AstNode<unknown>> | null);
    byteLength(): number;
}
export declare class AnnotationAstNode implements AstNode<AstNode<unknown>> {
    readonly val: AstNode<unknown>;
    readonly annotations: number[];
    readonly len: number;
    readonly annotationLen: number;
    constructor(val: AstNode<unknown>, annotations: number[]);
    byteLength(): number;
}
export declare const toAst: (val: unknown, symbols: Import) => AstNode<unknown>;
