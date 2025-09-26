import { MsgPackEncoderFast } from './MsgPackEncoderFast';
export declare class MsgPackEncoderStable extends MsgPackEncoderFast {
    writeObj(obj: Record<string, unknown>): void;
}
