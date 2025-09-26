import { CborEncoder } from './CborEncoder';
export declare class CborEncoderStable extends CborEncoder {
    writeObj(obj: Record<string, unknown>): void;
    writeStr(str: string): void;
    writeUndef(): void;
}
