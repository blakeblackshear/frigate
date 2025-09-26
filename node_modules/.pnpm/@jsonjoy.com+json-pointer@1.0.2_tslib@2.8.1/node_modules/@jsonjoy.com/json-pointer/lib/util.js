"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInteger = exports.isRoot = exports.toPath = void 0;
exports.unescapeComponent = unescapeComponent;
exports.escapeComponent = escapeComponent;
exports.parseJsonPointer = parseJsonPointer;
exports.formatJsonPointer = formatJsonPointer;
exports.isChild = isChild;
exports.isPathEqual = isPathEqual;
exports.parent = parent;
exports.isValidIndex = isValidIndex;
const r1 = /~1/g;
const r2 = /~0/g;
const r3 = /~/g;
const r4 = /\//g;
/**
 * Un-escapes a JSON pointer path component.
 */
function unescapeComponent(component) {
    if (component.indexOf('~') === -1)
        return component;
    return component.replace(r1, '/').replace(r2, '~');
}
/**
 * Escapes a JSON pointer path component.
 */
function escapeComponent(component) {
    if (component.indexOf('/') === -1 && component.indexOf('~') === -1)
        return component;
    return component.replace(r3, '~0').replace(r4, '~1');
}
/**
 * Convert JSON pointer like "/foo/bar" to array like ["", "foo", "bar"], while
 * also un-escaping reserved characters.
 */
function parseJsonPointer(pointer) {
    if (!pointer)
        return [];
    // TODO: Performance of this line can be improved: (1) don't use .split(); (2) don't use .map().
    return pointer.slice(1).split('/').map(unescapeComponent);
}
/**
 * Escape and format a path array like ["", "foo", "bar"] to JSON pointer
 * like "/foo/bar".
 */
function formatJsonPointer(path) {
    if ((0, exports.isRoot)(path))
        return '';
    return '/' + path.map((component) => escapeComponent(String(component))).join('/');
}
const toPath = (pointer) => (typeof pointer === 'string' ? parseJsonPointer(pointer) : pointer);
exports.toPath = toPath;
/**
 * Returns true if `parent` contains `child` path, false otherwise.
 */
function isChild(parent, child) {
    if (parent.length >= child.length)
        return false;
    for (let i = 0; i < parent.length; i++)
        if (parent[i] !== child[i])
            return false;
    return true;
}
function isPathEqual(p1, p2) {
    if (p1.length !== p2.length)
        return false;
    for (let i = 0; i < p1.length; i++)
        if (p1[i] !== p2[i])
            return false;
    return true;
}
// export function getSharedPath(one: Path, two: Path): Path {
//   const min = Math.min(one.length, two.length);
//   const res: string[] = [];
//   for (let i = 0; i < min; i++) {
//     if (one[i] === two[i]) res.push(one[i]);
//     else break;
//   }
//   return res as Path;
// }
/**
 * Returns true if JSON Pointer points to root value, false otherwise.
 */
const isRoot = (path) => !path.length;
exports.isRoot = isRoot;
/**
 * Returns parent path, e.g. for ['foo', 'bar', 'baz'] returns ['foo', 'bar'].
 */
function parent(path) {
    if (path.length < 1)
        throw new Error('NO_PARENT');
    return path.slice(0, path.length - 1);
}
/**
 * Check if path component can be a valid array index.
 */
function isValidIndex(index) {
    if (typeof index === 'number')
        return true;
    const n = Number.parseInt(index, 10);
    return String(n) === index && n >= 0;
}
const isInteger = (str) => {
    const len = str.length;
    let i = 0;
    let charCode;
    while (i < len) {
        charCode = str.charCodeAt(i);
        if (charCode >= 48 && charCode <= 57) {
            i++;
            continue;
        }
        return false;
    }
    return true;
};
exports.isInteger = isInteger;
