/**
 * Creates promises of a list of values. Resolves all promises and
 * returns an array of resolved values.
 */
export declare const promiseMap: (values: any[], onValue: (value: unknown) => Promise<unknown>, onError?: (error?: unknown, value?: unknown, index?: number) => void) => Promise<any>;
