export declare class BsonObjectId {
    timestamp: number;
    process: number;
    counter: number;
    constructor(timestamp: number, process: number, counter: number);
}
export declare class BsonDbPointer {
    name: string;
    id: BsonObjectId;
    constructor(name: string, id: BsonObjectId);
}
export declare class BsonJavascriptCode {
    code: string;
    constructor(code: string);
}
export declare class BsonSymbol {
    symbol: string;
    constructor(symbol: string);
}
export declare class BsonJavascriptCodeWithScope {
    code: string;
    scope: Record<string, unknown>;
    constructor(code: string, scope: Record<string, unknown>);
}
export declare class BsonInt32 {
    value: number;
    constructor(value: number);
}
export declare class BsonInt64 {
    value: number;
    constructor(value: number);
}
export declare class BsonFloat {
    value: number;
    constructor(value: number);
}
export declare class BsonTimestamp {
    increment: number;
    timestamp: number;
    constructor(increment: number, timestamp: number);
}
export declare class BsonDecimal128 {
    data: Uint8Array;
    constructor(data: Uint8Array);
}
export declare class BsonMinKey {
}
export declare class BsonMaxKey {
}
export declare class BsonBinary {
    subtype: number;
    data: Uint8Array;
    constructor(subtype: number, data: Uint8Array);
}
