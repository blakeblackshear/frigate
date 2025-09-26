/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { isCrossReference, isRuleCall } from '../languages/generated/ast.js';
import { getCrossReferenceTerminal, getRuleType } from '../utils/grammar-utils.js';
export class DefaultValueConverter {
    convert(input, cstNode) {
        let feature = cstNode.grammarSource;
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
    runConverter(rule, input, cstNode) {
        var _a;
        switch (rule.name.toUpperCase()) {
            case 'INT': return ValueConverter.convertInt(input);
            case 'STRING': return ValueConverter.convertString(input);
            case 'ID': return ValueConverter.convertID(input);
        }
        switch ((_a = getRuleType(rule)) === null || _a === void 0 ? void 0 : _a.toLowerCase()) {
            case 'number': return ValueConverter.convertNumber(input);
            case 'boolean': return ValueConverter.convertBoolean(input);
            case 'bigint': return ValueConverter.convertBigint(input);
            case 'date': return ValueConverter.convertDate(input);
            default: return input;
        }
    }
}
export var ValueConverter;
(function (ValueConverter) {
    function convertString(input) {
        let result = '';
        for (let i = 1; i < input.length - 1; i++) {
            const c = input.charAt(i);
            if (c === '\\') {
                const c1 = input.charAt(++i);
                result += convertEscapeCharacter(c1);
            }
            else {
                result += c;
            }
        }
        return result;
    }
    ValueConverter.convertString = convertString;
    function convertEscapeCharacter(char) {
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
    function convertID(input) {
        if (input.charAt(0) === '^') {
            return input.substring(1);
        }
        else {
            return input;
        }
    }
    ValueConverter.convertID = convertID;
    function convertInt(input) {
        return parseInt(input);
    }
    ValueConverter.convertInt = convertInt;
    function convertBigint(input) {
        return BigInt(input);
    }
    ValueConverter.convertBigint = convertBigint;
    function convertDate(input) {
        return new Date(input);
    }
    ValueConverter.convertDate = convertDate;
    function convertNumber(input) {
        return Number(input);
    }
    ValueConverter.convertNumber = convertNumber;
    function convertBoolean(input) {
        return input.toLowerCase() === 'true';
    }
    ValueConverter.convertBoolean = convertBoolean;
})(ValueConverter || (ValueConverter = {}));
//# sourceMappingURL=value-converter.js.map