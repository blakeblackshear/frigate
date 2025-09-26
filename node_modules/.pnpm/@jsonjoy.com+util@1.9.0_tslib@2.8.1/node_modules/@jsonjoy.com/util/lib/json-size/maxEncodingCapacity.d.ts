export declare const enum MaxEncodingOverhead {
    Null = 4,
    Boolean = 5,
    Number = 22,
    String = 5,
    StringLengthMultiplier = 5,
    Binary = 41,
    BinaryLengthMultiplier = 2,
    Array = 5,
    ArrayElement = 1,
    Object = 5,
    ObjectElement = 2,
    Undefined = 45
}
export declare const maxEncodingCapacity: (value: unknown) => number;
