export function toJs(tree: Program, options: OptionsWithSourceMapGenerator): ResultWithSourceMapGenerator;
export function toJs(tree: Program, options: OptionsWithMaybeMapGenerator): ResultWithMaybeSourceMapGenerator;
export function toJs(tree: Program, options?: OptionsWithoutSourceMapGenerator | null | undefined): ResultWithoutSourceMapGenerator;
export type State = import('astring').State;
export type Nodes = import('estree-jsx').Node;
export type Program = import('estree-jsx').Program;
export type SourceMapGenerator = typeof import('source-map').SourceMapGenerator;
export type Map = import('source-map').RawSourceMap;
export type Generator = Record<Nodes['type'], Handler>;
/**
 * Handle a particular node.
 */
export type Handler = (this: Generator, node: any, state: State) => undefined;
export type Handlers = Partial<import('astring').Generator>;
/**
 * Configuration.
 */
export type Options = OptionsWithMaybeMapGenerator;
/**
 * Base shared option fields.
 */
export type OptionsFieldsBase = {
    /**
     * Object mapping node types to functions handling the corresponding nodes.
     */
    handlers?: Handlers | null | undefined;
};
/**
 * Extra option fields where there’s definitely no source map generator.
 */
export type OptionsFieldsWithoutSourceMapGenerator = {
    /**
     * Generate a source map by passing a `SourceMapGenerator` from `source-map`
     * in; this works if there is positional info on nodes.
     */
    SourceMapGenerator?: null | undefined;
    /**
     * Path to input file; only used in source map.
     */
    filePath?: null | undefined;
};
/**
 * Extra option fields where there’s definitely a source map generator.
 */
export type OptionsFieldsWithSourceMapGenerator = {
    /**
     *   Generate a source map by passing a `SourceMapGenerator` from `source-map`
     *   in; this works if there is positional info on nodes.
     */
    SourceMapGenerator: SourceMapGenerator;
    /**
     * Path to input file; only used in source map.
     */
    filePath?: string | null | undefined;
};
/**
 * Extra option fields where there may or may not be a source map generator.
 */
export type OptionsFieldsMaybeSourceMapGenerator = {
    /**
     * Generate a source map by passing a `SourceMapGenerator` from `source-map`
     * in; this works if there is positional info on nodes.
     */
    SourceMapGenerator?: SourceMapGenerator | null | undefined;
    /**
     * Path to input file; only used in source map.
     */
    filePath?: string | null | undefined;
};
/**
 * Options where there’s definitely no source map generator.
 */
export type OptionsWithoutSourceMapGenerator = OptionsFieldsBase & OptionsFieldsWithoutSourceMapGenerator;
/**
 * Options where there’s definitely a source map generator.
 */
export type OptionsWithSourceMapGenerator = OptionsFieldsBase & OptionsFieldsWithSourceMapGenerator;
/**
 * Options where there may or may not be a source map generator.
 */
export type OptionsWithMaybeMapGenerator = OptionsFieldsBase & OptionsFieldsMaybeSourceMapGenerator;
/**
 * Result.
 */
export type Result = ResultWithMaybeSourceMapGenerator;
/**
 * Base shared result fields.
 */
export type ResultFieldsBase = {
    /**
     *   Serialized JavaScript.
     */
    value: string;
};
/**
 * Extra result fields where there’s definitely no source map generator.
 */
export type ResultFieldsWithoutSourceMapGenerator = {
    /**
     *   Source map as (parsed) JSON, if `SourceMapGenerator` is passed.
     */
    map: undefined;
};
/**
 * Extra result fields where there’s definitely a source map generator.
 */
export type ResultFieldsWithSourceMapGenerator = {
    /**
     *   Source map as (parsed) JSON, if `SourceMapGenerator` is not passed.
     */
    map: Map;
};
/**
 * Extra result fields where there may or may not be a source map generator.
 */
export type ResultFieldsMaybeSourceMapGenerator = {
    /**
     *   Source map as (parsed) JSON, if `SourceMapGenerator` might be passed.
     */
    map: Map | undefined;
};
/**
 * Result where there’s definitely no source map generator.
 */
export type ResultWithoutSourceMapGenerator = ResultFieldsBase & ResultFieldsWithoutSourceMapGenerator;
/**
 * Result where there’s definitely a source map generator.
 */
export type ResultWithSourceMapGenerator = ResultFieldsBase & ResultFieldsWithSourceMapGenerator;
/**
 * Result where there may or may not be a source map generator.
 */
export type ResultWithMaybeSourceMapGenerator = ResultFieldsBase & ResultFieldsMaybeSourceMapGenerator;
