import { List } from "immutable";
import { LinePartCss } from "../LinePart";
export declare const ENCODED_NEWLINE = 10;
export declare const ENCODED_CARRIAGE_RETURN = 13;
export declare const SEARCH_BAR_HEIGHT = 45;
export declare const isNewline: (current: number) => boolean;
export declare const getScrollIndex: ({ follow, scrollToLine, previousCount, count, offset, }: {
    follow?: boolean | undefined;
    scrollToLine?: number | undefined;
    previousCount?: number | undefined;
    count?: number | undefined;
    offset?: number | undefined;
}) => number;
export declare const getHighlightRange: (highlight: any) => import("immutable").Seq.Indexed<number>;
export declare const bufferConcat: (a: Uint8Array, b: Uint8Array) => Uint8Array;
export declare const convertBufferToLines: (currentArray: Uint8Array, previousArray?: Uint8Array) => {
    lines: List<Uint8Array>;
    remaining: Uint8Array | null;
};
export declare const getLinesLengthRanges: (rawLog: Uint8Array) => number[];
export declare const searchFormatPart: ({ searchKeywords, nextFormatPart, caseInsensitive, replaceJsx, selectedLine, replaceJsxHighlight, highlightedWordLocation, }: any) => (part: any) => any;
/**
 * Parses an array of text lines and identifies URLs and email addresses, converting them into clickable links.
 *
 * @param lines - Array of line objects containing text to parse
 * @returns Array of LinePartCss objects with identified links and emails marked up
 */
export declare const parseLinks: (lines: any[]) => LinePartCss[];
