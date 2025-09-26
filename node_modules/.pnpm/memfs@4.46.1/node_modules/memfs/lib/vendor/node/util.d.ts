/**
 * Minimal implementation of Node.js util.inherits function.
 * Sets up prototype inheritance between constructor functions.
 */
export declare function inherits(ctor: any, superCtor: any): void;
/**
 * Minimal implementation of Node.js util.promisify function.
 * Converts callback-based functions to Promise-based functions.
 */
export declare function promisify(fn: Function): Function;
/**
 * Minimal implementation of Node.js util.inspect function.
 * Converts a value to a string representation for debugging.
 */
export declare function inspect(value: any): string;
/**
 * Minimal implementation of Node.js util.format function.
 * Provides printf-style string formatting with basic placeholder support.
 */
export declare function format(template: string, ...args: any[]): string;
