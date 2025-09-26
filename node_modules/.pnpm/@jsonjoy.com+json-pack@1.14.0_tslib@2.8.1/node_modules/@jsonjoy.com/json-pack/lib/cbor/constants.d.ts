export declare const enum MAJOR {
    UIN = 0,
    NIN = 1,
    BIN = 2,
    STR = 3,
    ARR = 4,
    MAP = 5,
    TAG = 6,
    TKN = 7
}
export declare const enum MAJOR_OVERLAY {
    UIN = 0,
    NIN = 32,
    BIN = 64,
    STR = 96,
    ARR = 128,
    MAP = 160,
    TAG = 192,
    TKN = 224
}
export declare const enum CONST {
    MINOR_MASK = 31,
    MAX_UINT = 9007199254740991,
    END = 255
}
export declare const enum ERROR {
    UNEXPECTED_MAJOR = 0,
    UNEXPECTED_MINOR = 1,
    UNEXPECTED_BIN_CHUNK_MAJOR = 2,
    UNEXPECTED_BIN_CHUNK_MINOR = 3,
    UNEXPECTED_STR_CHUNK_MAJOR = 4,
    UNEXPECTED_STR_CHUNK_MINOR = 5,
    UNEXPECTED_OBJ_KEY = 6,
    UNEXPECTED_OBJ_BREAK = 7,
    INVALID_SIZE = 8,
    KEY_NOT_FOUND = 9,
    INDEX_OUT_OF_BOUNDS = 10,
    UNEXPECTED_STR_MAJOR = 11
}
