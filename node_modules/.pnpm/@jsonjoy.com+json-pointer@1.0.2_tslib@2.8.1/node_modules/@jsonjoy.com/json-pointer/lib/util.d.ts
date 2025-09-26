import type { Path } from './types';
/**
 * Un-escapes a JSON pointer path component.
 */
export declare function unescapeComponent(component: string): string;
/**
 * Escapes a JSON pointer path component.
 */
export declare function escapeComponent(component: string): string;
/**
 * Convert JSON pointer like "/foo/bar" to array like ["", "foo", "bar"], while
 * also un-escaping reserved characters.
 */
export declare function parseJsonPointer(pointer: string): Path;
/**
 * Escape and format a path array like ["", "foo", "bar"] to JSON pointer
 * like "/foo/bar".
 */
export declare function formatJsonPointer(path: Path): string;
export declare const toPath: (pointer: string | Path) => Path;
/**
 * Returns true if `parent` contains `child` path, false otherwise.
 */
export declare function isChild(parent: Path, child: Path): boolean;
export declare function isPathEqual(p1: Path, p2: Path): boolean;
/**
 * Returns true if JSON Pointer points to root value, false otherwise.
 */
export declare const isRoot: (path: Path) => boolean;
/**
 * Returns parent path, e.g. for ['foo', 'bar', 'baz'] returns ['foo', 'bar'].
 */
export declare function parent(path: Path): Path;
/**
 * Check if path component can be a valid array index.
 */
export declare function isValidIndex(index: string | number): boolean;
export declare const isInteger: (str: string) => boolean;
