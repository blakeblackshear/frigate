type HeadersList = Array<[string, string | string[]]>;
type FlatHeadersList = [string, string][];
type HeadersObject = Record<string, string | string[]>;
type FlatHeadersObject = Record<string, string>;

declare const NORMALIZED_HEADERS: unique symbol;
declare const RAW_HEADER_NAMES: unique symbol;
declare class Headers$1 {
    private [NORMALIZED_HEADERS];
    private [RAW_HEADER_NAMES];
    constructor(init?: HeadersInit | HeadersObject | HeadersList);
    [Symbol.toStringTag]: string;
    [Symbol.iterator](): IterableIterator<[string, string]>;
    keys(): IterableIterator<string>;
    values(): IterableIterator<string>;
    entries(): IterableIterator<[string, string]>;
    /**
     * Returns a boolean stating whether a `Headers` object contains a certain header.
     */
    has(name: string): boolean;
    /**
     * Returns a `ByteString` sequence of all the values of a header with a given name.
     */
    get(name: string): string | null;
    /**
     * Sets a new value for an existing header inside a `Headers` object, or adds the header if it does not already exist.
     */
    set(name: string, value: string): void;
    /**
     * Appends a new value onto an existing header inside a `Headers` object, or adds the header if it does not already exist.
     */
    append(name: string, value: string): void;
    /**
     * Deletes a header from the `Headers` object.
     */
    delete(name: string): void;
    /**
     * Traverses the `Headers` object,
     * calling the given callback for each header.
     */
    forEach<ThisArg = this>(callback: (this: ThisArg, value: string, name: string, parent: this) => void, thisArg?: ThisArg): void;
    /**
     * Returns an array containing the values
     * of all Set-Cookie headers associated
     * with a response
     */
    getSetCookie(): string[];
}

/**
 * Returns the object of all raw headers.
 */
declare function getRawHeaders(headers: Headers): Record<string, string>;

/**
 * Converts a given `Headers` instance to its string representation.
 */
declare function headersToString(headers: Headers): string;

declare function headersToList(headers: Headers): HeadersList;

/**
 * Converts a given `Headers` instance into a plain object.
 * Respects headers with multiple values.
 */
declare function headersToObject(headers: Headers): HeadersObject;

/**
 * Converts a string representation of headers (i.e. from XMLHttpRequest)
 * to a new `Headers` instance.
 */
declare function stringToHeaders(str: string): Headers$1;

declare function listToHeaders(list: HeadersList): Headers$1;

/**
 * Converts a given headers object to a new `Headers` instance.
 */
declare function objectToHeaders(headersObject: Record<string, string | string[] | undefined>): Headers$1;

/**
 * Reduces given headers object instnace.
 */
declare function reduceHeadersObject<R>(headers: HeadersObject, reducer: (headers: R, name: string, value: string | string[]) => R, initialState: R): R;

declare function flattenHeadersList(list: HeadersList): FlatHeadersList;

declare function flattenHeadersObject(headersObject: HeadersObject): FlatHeadersObject;

export { FlatHeadersList, FlatHeadersObject, Headers$1 as Headers, HeadersList, HeadersObject, flattenHeadersList, flattenHeadersObject, getRawHeaders, headersToList, headersToObject, headersToString, listToHeaders, objectToHeaders, reduceHeadersObject, stringToHeaders };
