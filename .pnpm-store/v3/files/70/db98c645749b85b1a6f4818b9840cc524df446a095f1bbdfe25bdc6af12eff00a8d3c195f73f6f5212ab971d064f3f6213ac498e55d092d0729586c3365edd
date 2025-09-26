import { StreamingReader } from '@jsonjoy.com/buffers/lib/StreamingReader';
import { RespDecoder } from './RespDecoder';
export declare class RespStreamingDecoder {
    protected readonly reader: StreamingReader;
    protected readonly decoder: RespDecoder<StreamingReader>;
    get tryUtf8(): boolean;
    set tryUtf8(value: boolean);
    push(uint8: Uint8Array): void;
    read(): unknown | undefined;
    readCmd(): [cmd: string, ...args: Uint8Array[]] | undefined;
    skip(): null | undefined;
}
