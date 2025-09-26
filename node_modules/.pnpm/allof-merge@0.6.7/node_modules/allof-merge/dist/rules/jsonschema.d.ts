import type { MergeRules } from "../types";
export declare const jsonSchemaVersion: readonly ["draft-04", "draft-06"];
export type JsonSchemaVersion = typeof jsonSchemaVersion[number];
export declare const jsonSchemaMergeRules: (draft?: JsonSchemaVersion, customRules?: MergeRules) => MergeRules;
