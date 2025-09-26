/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { AbstractElement, AbstractRule } from '../languages/generated/ast.js';
import type { CstNode } from '../syntax-tree.js';
import { isCrossReference, isRuleCall } from '../languages/generated/ast.js';
import { getCrossReferenceTerminal, getRuleType } from '../utils/grammar-utils.js';

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

export class DefaultValueConverter implements ValueConverter {

    convert(input: string, cstNode: CstNode): ValueType {
        let feature: AbstractElement | undefined = cstNode.grammarSource;
        if (isCrossReference(feature)) {
            feature = getCrossReferenceTerminal(feature);
        }
        if (isRuleCall(feature)) {
            const rule = feature.rule.ref;
            if (!rule) {
                throw new Error('This cst node was not parsed by a rule.');
            }
            return this.runConverter(rule, input, cstNode);
        }
        return input;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected runConverter(rule: AbstractRule, input: string, cstNode: CstNode): ValueType {
        switch (rule.name.toUpperCase()) {
            case 'INT': return ValueConverter.convertInt(input);
            case 'STRING': return ValueConverter.convertString(input);
            case 'ID': return ValueConverter.convertID(input);
        }
        switch (getRuleType(rule)?.toLowerCase()) {
            case 'number': return ValueConverter.convertNumber(input);
            case 'boolean': return ValueConverter.convertBoolean(input);
            case 'bigint': return ValueConverter.convertBigint(input);
            case 'date': return ValueConverter.convertDate(input);
            default: return input;
        }
    }
}

export namespace ValueConverter {

    export function convertString(input: string): string {
        let result = '';
        for (let i = 1; i < input.length - 1; i++) {
            const c = input.charAt(i);
            if (c === '\\') {
                const c1 = input.charAt(++i);
                result += convertEscapeCharacter(c1);
            } else {
                result += c;
            }
        }
        return result;
    }

    function convertEscapeCharacter(char: string): string {
        switch (char) {
            case 'b': return '\b';
            case 'f': return '\f';
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            case 'v': return '\v';
            case '0': return '\0';
            default: return char;
        }
    }

    export function convertID(input: string): string {
        if (input.charAt(0) === '^') {
            return input.substring(1);
        } else {
            return input;
        }
    }

    export function convertInt(input: string): number {
        return parseInt(input);
    }

    export function convertBigint(input: string): bigint {
        return BigInt(input);
    }

    export function convertDate(input: string): Date {
        return new Date(input);
    }

    export function convertNumber(input: string): number {
        return Number(input);
    }

    export function convertBoolean(input: string): boolean {
        return input.toLowerCase() === 'true';
    }

}
