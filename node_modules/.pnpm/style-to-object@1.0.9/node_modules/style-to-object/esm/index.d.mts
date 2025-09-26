import type { Declaration } from 'inline-style-parser';
export { Declaration };
interface StyleObject {
    [name: string]: string;
}
type Iterator = (property: string, value: string, declaration: Declaration) => void;
/**
 * Parses inline style to object.
 *
 * @param style - Inline style.
 * @param iterator - Iterator.
 * @returns - Style object or null.
 *
 * @example Parsing inline style to object:
 *
 * ```js
 * import parse from 'style-to-object';
 * parse('line-height: 42;'); // { 'line-height': '42' }
 * ```
 */
export default function StyleToObject(style: string, iterator?: Iterator): StyleObject | null;
