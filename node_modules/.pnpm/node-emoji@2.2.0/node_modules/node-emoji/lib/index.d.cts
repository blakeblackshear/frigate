type EmojifyFormat = (name: string, part?: string, input?: string) => string;
interface EmojifyOptions {
    /**
     * The string to fallback to if an emoji was not found.
     */
    fallback?: ((part: string) => string) | string;
    /**
     * Adds a middleware layer to modify each matched emoji after parsing.
     */
    format?: EmojifyFormat;
}
/**
 * Parse all markdown-encoded emojis in a string.
 */
declare const emojify: (input: string, { fallback, format }?: EmojifyOptions) => string;

/**
 * Get the name and character of an emoji.
 */
declare const find: (codeOrName: string) => {
    emoji: string;
    key: string;
} | undefined;

/**
 * Get an emoji from an emoji name.
 */
declare const get: (codeOrName: string) => string | undefined;

/**
 * Check if this library supports a specific emoji.
 */
declare const has: (codeOrName: string) => boolean;

/**
 * Get a random emoji.
 */
declare const random: () => {
    emoji: string;
    name: string;
};

interface Emoji {
    emoji: string;
    key: string;
}

type ReplaceReplacement = (emoji: Emoji, index: number, string: string) => string;
/**
 * Replace the emojis in a string.
 */
declare const replace: (input: string, replacement: ReplaceReplacement | string, { preserveSpaces }?: {
    preserveSpaces?: boolean | undefined;
}) => string;

/**
 * Search for emojis containing the provided name or pattern in their name.
 */
declare const search: (keyword: RegExp | string) => {
    emoji: string;
    name: string;
}[];

interface StripOptions {
    /**
     * Whether to keep the extra space after a stripped emoji.
     */
    preserveSpaces?: boolean;
}
/**
 * Remove all the emojis from a string.
 */
declare const strip: (input: string, { preserveSpaces }?: StripOptions) => string;

/**
 * Convert all emojis in a string to their markdown-encoded counterparts.
 */
declare const unemojify: (input: string) => string;

interface WhichOptions {
    markdown?: boolean;
}
/**
 * Get an emoji name from an emoji.
 */
declare const which: (emoji: string, { markdown }?: WhichOptions) => string | undefined;

export { type EmojifyFormat, type EmojifyOptions, type ReplaceReplacement, type StripOptions, type WhichOptions, emojify, find, get, has, random, replace, search, strip, unemojify, which };
