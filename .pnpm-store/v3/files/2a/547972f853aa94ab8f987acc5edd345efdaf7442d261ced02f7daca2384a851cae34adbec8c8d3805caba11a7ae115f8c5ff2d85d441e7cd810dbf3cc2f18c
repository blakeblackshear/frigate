/**
 * Create an extension for `micromark` to enable MDX ESM syntax.
 *
 * @param {Options} options
 *   Configuration (required).
 * @returns {Extension}
 *   Extension for `micromark` that can be passed in `extensions` to enable MDX
 *   ESM syntax.
 */
export function mdxjsEsm(options: Options): Extension;
export type Acorn = import('micromark-util-events-to-acorn').Acorn;
export type AcornOptions = import('micromark-util-events-to-acorn').AcornOptions;
export type Extension = import('micromark-util-types').Extension;
export type State = import('micromark-util-types').State;
export type TokenizeContext = import('micromark-util-types').TokenizeContext;
export type Tokenizer = import('micromark-util-types').Tokenizer;
/**
 * Configuration (required).
 */
export type Options = {
    /**
     *   Acorn parser to use (required).
     */
    acorn: Acorn;
    /**
     * Configuration for acorn (default: `{ecmaVersion: 2024, locations: true,
     * sourceType: 'module'}`); all fields except `locations` can be set.
     */
    acornOptions?: AcornOptions | null | undefined;
    /**
     * Whether to add `estree` fields to tokens with results from acorn
     * (default: `false`).
     */
    addResult?: boolean | null | undefined;
};
