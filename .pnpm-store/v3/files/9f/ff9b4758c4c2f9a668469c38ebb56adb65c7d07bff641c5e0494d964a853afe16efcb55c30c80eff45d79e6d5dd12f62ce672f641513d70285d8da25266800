import type { IWriter, IWriterGrowable } from '@jsonjoy.com/buffers/lib';
import { AnnotationAstNode, ArrAstNode, AstNode, BinAstNode, BoolAstNode, FloatAstNode, NintAstNode, ObjAstNode, StrAstNode, UintAstNode } from './ast';
import { Import } from './Import';
export declare class IonEncoderFast {
    readonly writer: IWriter & IWriterGrowable;
    protected symbols?: Import;
    constructor(writer?: IWriter & IWriterGrowable);
    encode(value: unknown): Uint8Array;
    writeAny(value: AstNode<unknown>): void;
    writeIvm(): void;
    writeSymbolTable(): void;
    writeAnnotations(node: AnnotationAstNode): void;
    writeBool(node: BoolAstNode): void;
    encodeUint(node: UintAstNode): void;
    encodeNint(node: NintAstNode): void;
    writeFloat(node: FloatAstNode): void;
    writeVUint(num: number): void;
    writeStr(node: StrAstNode): void;
    writeBin(node: BinAstNode): void;
    writeArr(node: ArrAstNode): void;
    writeObj(node: ObjAstNode): void;
}
