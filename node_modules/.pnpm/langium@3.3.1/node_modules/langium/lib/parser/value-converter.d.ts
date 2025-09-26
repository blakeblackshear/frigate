/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { AbstractRule } from '../languages/generated/ast.js';
import type { CstNode } from '../syntax-tree.js';
/**
 * Language-specific service for converting string values from the source text format into a value to be held in the AST.
 */
export interface ValueConverter {
    /**
     * Converts a string value from the source text format into a value to be held in the AST.
     */
    convert(input: string, cstNode: CstNode): ValueType;
}
export type ValueType = string | number | boolean | bigint | Date;
export declare class DefaultValueConverter implements ValueConverter {
    convert(input: string, cstNode: CstNode): ValueType;
    protected runConverter(rule: AbstractRule, input: string, cstNode: CstNode): ValueType;
}
export declare namespace ValueConverter {
    function convertString(input: string): string;
    function convertID(input: string): string;
    function convertInt(input: string): number;
    function convertBigint(input: string): bigint;
    function convertDate(input: string): Date;
    function convertNumber(input: string): number;
    function convertBoolean(input: string): boolean;
}
//# sourceMappingURL=value-converter.d.ts.map