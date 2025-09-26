import type { Rule } from "@chevrotain/types";
export declare function buildModel(productions: Record<string, Rule>): CstNodeTypeDefinition[];
export type CstNodeTypeDefinition = {
    name: string;
    properties: PropertyTypeDefinition[];
};
export type PropertyTypeDefinition = {
    name: string;
    type: PropertyArrayType;
    optional: boolean;
};
export type PropertyArrayType = TokenArrayType | RuleArrayType | (TokenArrayType | RuleArrayType)[];
export type TokenArrayType = {
    kind: "token";
};
export type RuleArrayType = {
    kind: "rule";
    name: string;
};
