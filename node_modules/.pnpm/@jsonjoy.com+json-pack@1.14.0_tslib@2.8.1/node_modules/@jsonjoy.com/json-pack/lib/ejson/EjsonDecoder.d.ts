import { JsonDecoder } from '../json/JsonDecoder';
export interface EjsonDecoderOptions {
    legacy?: boolean;
}
export declare class EjsonDecoder extends JsonDecoder {
    private options;
    constructor(options?: EjsonDecoderOptions);
    decodeFromString(json: string): unknown;
    readAny(): unknown;
    readArr(): unknown[];
    readObjWithEjsonSupport(): unknown;
    private readValue;
    private readRawObj;
    private transformEjsonObject;
    private parseObjectId;
    private base64ToUint8Array;
    private isValidUuid;
    private uuidToBytes;
}
