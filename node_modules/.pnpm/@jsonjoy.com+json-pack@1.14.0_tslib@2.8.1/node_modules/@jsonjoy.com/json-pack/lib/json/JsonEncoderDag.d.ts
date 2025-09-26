import { JsonEncoderStable } from './JsonEncoderStable';
export declare class JsonEncoderDag extends JsonEncoderStable {
    writeBin(buf: Uint8Array): void;
    writeCid(cid: string): void;
}
