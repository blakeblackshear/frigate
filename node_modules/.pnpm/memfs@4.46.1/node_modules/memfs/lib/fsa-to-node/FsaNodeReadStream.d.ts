import { Readable } from '../vendor/node/stream';
import { Defer } from 'thingies/lib/Defer';
import type { FsaNodeFsOpenFile } from './FsaNodeFsOpenFile';
import type { IReadStream } from '../node/types/misc';
import type { IReadStreamOptions } from '../node/types/options';
import type { FsaNodeFs } from './FsaNodeFs';
export declare class FsaNodeReadStream extends Readable implements IReadStream {
    protected readonly fs: FsaNodeFs;
    protected readonly handle: Promise<FsaNodeFsOpenFile>;
    readonly path: string;
    protected readonly options: IReadStreamOptions;
    protected __pending__: boolean;
    protected __closed__: boolean;
    protected __bytes__: number;
    protected readonly __mutex__: <T = unknown>(code: import("thingies").Code<T>) => Promise<T>;
    protected readonly __file__: Defer<FsaNodeFsOpenFile>;
    constructor(fs: FsaNodeFs, handle: Promise<FsaNodeFsOpenFile>, path: string, options: IReadStreamOptions);
    private __read__;
    private __close__;
    get bytesRead(): number;
    get pending(): boolean;
    _read(): void;
}
