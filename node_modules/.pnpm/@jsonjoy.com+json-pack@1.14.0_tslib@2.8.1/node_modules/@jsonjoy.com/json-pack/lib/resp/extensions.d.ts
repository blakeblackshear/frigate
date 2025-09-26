import { JsonPackExtension } from '../JsonPackExtension';
export declare class RespPush extends JsonPackExtension<unknown[]> {
    readonly val: unknown[];
    constructor(val: unknown[]);
}
export declare class RespAttributes extends JsonPackExtension<Record<string, unknown>> {
    readonly val: Record<string, unknown>;
    constructor(val: Record<string, unknown>);
}
export declare class RespVerbatimString extends JsonPackExtension<string> {
    readonly val: string;
    constructor(val: string);
}
