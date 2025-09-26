import type { CSSToken } from '@csstools/css-tokenizer';
import { ParseError } from '@csstools/css-tokenizer';

export declare function addLayerToModel(layers: Array<LayerName>, currentLayerNames: Array<LayerName>): void;

export declare class LayerName {
    parts: Array<CSSToken>;
    constructor(parts: Array<CSSToken>);
    tokens(): Array<CSSToken>;
    slice(start: number, end: number): LayerName;
    concat(other: LayerName): LayerName;
    segments(): Array<string>;
    name(): string;
    equal(other: LayerName): boolean;
    toString(): string;
    /**
     * @internal
     *
     * A debug helper to convert the current object to a JSON representation.
     */
    toJSON(): Record<string, unknown>;
}

export declare function parse(source: string, options?: {
    onParseError?: (error: ParseError) => void;
}): Array<LayerName>;

/**
 * Parses an array of {@link https://github.com/csstools/postcss-plugins/tree/main/packages/css-tokenizer/docs/css-tokenizer.csstoken.md | CSSTokens} into a list of cascade layer names.
 */
export declare function parseFromTokens(tokens: Array<CSSToken>, options?: {
    onParseError?: (error: ParseError) => void;
}): Array<LayerName>;

export { }
