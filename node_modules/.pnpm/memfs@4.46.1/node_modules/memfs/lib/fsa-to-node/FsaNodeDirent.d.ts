import type { IDirent, TDataOut } from '../node/types/misc';
export declare class FsaNodeDirent implements IDirent {
    readonly name: TDataOut;
    protected readonly kind: 'file' | 'directory';
    constructor(name: TDataOut, kind: 'file' | 'directory');
    isDirectory(): boolean;
    isFile(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
}
