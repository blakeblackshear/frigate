import type { JsonSchema, MergeResolver } from "../types";
export declare const getPropertiesForMerge: (allOfItems: JsonSchema[]) => any[];
export declare const getPatternPropertiesForMerge: (allOfItems: JsonSchema[]) => any[];
export declare const propertiesMergeResolver: MergeResolver;
export declare const additionalPropertiesMergeResolver: MergeResolver;
