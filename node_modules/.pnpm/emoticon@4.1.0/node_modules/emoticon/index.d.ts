/**
 * @typedef Emoticon
 *   Info on an emoticon.
 * @property {string} description
 *   Associated description (from `wooorm/gemoji`).
 * @property {string} emoji
 *   Corresponding emoji.
 * @property {Array<string>} emoticons
 *   ASCII emoticons.
 * @property {string} name
 *   Name of an emoticon (preferred name from `wooorm/gemoji`).
 * @property {Array<string>} tags
 *   Associated tags (from `wooorm/gemoji`).
 */
/**
 * List of emoticons.
 *
 * @type {Array<Emoticon>}
 */
export const emoticon: Array<Emoticon>;
/**
 * Info on an emoticon.
 */
export type Emoticon = {
    /**
     *   Associated description (from `wooorm/gemoji`).
     */
    description: string;
    /**
     *   Corresponding emoji.
     */
    emoji: string;
    /**
     *   ASCII emoticons.
     */
    emoticons: Array<string>;
    /**
     *   Name of an emoticon (preferred name from `wooorm/gemoji`).
     */
    name: string;
    /**
     *   Associated tags (from `wooorm/gemoji`).
     */
    tags: Array<string>;
};
//# sourceMappingURL=index.d.ts.map