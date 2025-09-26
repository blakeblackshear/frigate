import { OpenAPIRef, OpenAPISchema, OpenAPISpec, Referenced } from "../types";
export type MergedOpenAPISchema = OpenAPISchema & {
    parentRefs?: string[];
};
/**
 * Loads and keeps spec. Provides raw spec operations
 */
export declare class OpenAPIParser {
    private options;
    specUrl?: string;
    spec: OpenAPISpec;
    private _refCounter;
    private allowMergeRefs;
    constructor(spec: OpenAPISpec, specUrl?: string, options?: {});
    validate(spec: any): void;
    /**
     * get spec part by JsonPointer ($ref)
     */
    byRef: <T extends any = any>(ref: string) => T | undefined;
    /**
     * checks if the object is OpenAPI reference (contains $ref property)
     */
    isRef(obj: any): obj is OpenAPIRef;
    /**
     * resets visited endpoints. should be run after
     */
    resetVisited(): void;
    exitRef<T>(ref: Referenced<T>): void;
    /**
     * Resolve given reference object or return as is if it is not a reference
     * @param obj object to dereference
     * @param forceCircular whether to dereference even if it is circular ref
     */
    deref<T extends object>(obj: OpenAPIRef | T, forceCircular?: boolean, mergeAsAllOf?: boolean): T;
    shallowDeref<T extends unknown>(obj: OpenAPIRef | T): T;
    mergeRefs(ref: any, resolved: any, mergeAsAllOf: boolean): any;
    /**
     * Merge allOf constraints.
     * @param schema schema with allOF
     * @param $ref pointer of the schema
     * @param forceCircular whether to dereference children even if it is a circular ref
     */
    mergeAllOf(schema: OpenAPISchema, $ref?: string, forceCircular?: boolean, used$Refs?: Set<string>): MergedOpenAPISchema;
    /**
     * Find all derived definitions among #/components/schemas from any of $refs
     * returns map of definition pointer to definition name
     * @param $refs array of references to find derived from
     */
    findDerived($refs: string[]): Record<string, string[] | string>;
    exitParents(shema: MergedOpenAPISchema): void;
    private hoistOneOfs;
}
