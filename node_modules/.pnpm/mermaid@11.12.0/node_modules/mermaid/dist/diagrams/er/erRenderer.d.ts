/**
 * Return a unique id based on the given string. Start with the prefix, then a hyphen, then the
 * simplified str, then a hyphen, then a unique uuid based on the str. (Hyphens are only included if needed.)
 * Although the official XML standard for ids says that many more characters are valid in the id,
 * this keeps things simple by accepting only A-Za-z0-9.
 *
 * @param {string} str Given string to use as the basis for the id. Default is `''`
 * @param {string} prefix String to put at the start, followed by '-'. Default is `''`
 * @returns {string}
 * @see https://www.w3.org/TR/xml/#NT-Name
 */
export function generateId(str?: string, prefix?: string): string;
export function setConf(cnf: any): void;
export function draw(text: any, id: any, _version: any, diagObj: any): void;
declare namespace _default {
    export { setConf };
    export { draw };
}
export default _default;
