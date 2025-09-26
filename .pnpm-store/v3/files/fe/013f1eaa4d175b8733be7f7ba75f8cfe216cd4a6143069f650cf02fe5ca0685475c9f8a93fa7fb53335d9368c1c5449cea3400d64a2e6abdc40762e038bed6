/**
 * Parse JavaScript to an esast.
 *
 * @param {Value} value
 *   Serialized JavaScript to parse.
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Program}
 *   Program node (as esast).
 */
export function fromJs(value: Value, options?: Options | null | undefined): Program;
export type ParserClass = typeof import('acorn').Parser;
export type Position = import('acorn').Position;
export type Comment = import('estree-jsx').Comment;
export type Program = import('estree-jsx').Program;
/**
 * Input value
 *
 * When a typed array, must be UTF-8.
 */
export type Value = Uint8Array | string;
/**
 * Extra fields in acorn errors.
 */
export type AcornErrorFields = {
    /**
     *   Index.
     */
    pos: number;
    /**
     *   Acorn position.
     */
    loc: Position;
};
/**
 * Acorn error.
 */
export type AcornError = Error & AcornErrorFields;
/**
 * Acorn plugin.
 */
export type Plugin = (Parser: ParserClass) => ParserClass;
/**
 * JavaScript version.
 *
 * `'latest'` is equivalent to the latest supported year.
 */
export type Version = 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 'latest';
/**
 * Configuration.
 */
export type Options = {
    /**
     * JavaScript version (year between 2015 and 2023 or `'latest'`,
     * default: `'latest'`).
     *
     * When a number, must be a year in the range `2015` and `2023` (both
     * including).
     * `'latest'` is the same as passing the latest supported year.
     *
     * > ☢️ **Danger**: `'latest'` is a sliding thing, you could consider it as
     * > breaking semver.
     * > Pass an actual year to lock that down.
     */
    version?: Version | null | undefined;
    /**
     * Whether this is a module (ESM) or a script (default: `false`).
     */
    module?: boolean | null | undefined;
    /**
     * Whether a return statement is allowed in the top scope (default: `false`).
     */
    allowReturnOutsideFunction?: boolean | null | undefined;
    /**
     * Whether import/export statements are allowed in the every scope (default:
     * `false`).
     */
    allowImportExportEverywhere?: boolean | null | undefined;
    /**
     * Whether `await` is allowed in the top scope (default: `version >= 2022`).
     */
    allowAwaitOutsideFunction?: boolean | null | undefined;
    /**
     * Whether `super` is allowed outside methods (default: `false`).
     */
    allowSuperOutsideMethod?: boolean | null | undefined;
    /**
     * Whether a shell hasbang is allowed (default: `false`).
     */
    allowHashBang?: boolean | null | undefined;
    /**
     * List of acorn plugins (default: `[]`); examples are `acorn-jsx` and
     * `acorn-stage3`.
     */
    plugins?: Array<Plugin> | null | undefined;
};
