"use strict";
/**
 * @fileoverview Really small utility functions that didn't deserve their own files
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberNameType = void 0;
exports.arrayGroupByToMap = arrayGroupByToMap;
exports.arraysAreEqual = arraysAreEqual;
exports.findFirstResult = findFirstResult;
exports.formatWordList = formatWordList;
exports.getEnumNames = getEnumNames;
exports.getNameFromIndexSignature = getNameFromIndexSignature;
exports.getNameFromMember = getNameFromMember;
exports.isDefinitionFile = isDefinitionFile;
exports.isRestParameterDeclaration = isRestParameterDeclaration;
exports.isParenlessArrowFunction = isParenlessArrowFunction;
exports.typeNodeRequiresParentheses = typeNodeRequiresParentheses;
exports.upperCaseFirst = upperCaseFirst;
exports.findLastIndex = findLastIndex;
const type_utils_1 = require("@typescript-eslint/type-utils");
const utils_1 = require("@typescript-eslint/utils");
const ts = __importStar(require("typescript"));
const astUtils_1 = require("./astUtils");
const DEFINITION_EXTENSIONS = [
    ts.Extension.Dts,
    ts.Extension.Dcts,
    ts.Extension.Dmts,
];
/**
 * Check if the context file name is *.d.ts or *.d.tsx
 */
function isDefinitionFile(fileName) {
    const lowerFileName = fileName.toLowerCase();
    for (const definitionExt of DEFINITION_EXTENSIONS) {
        if (lowerFileName.endsWith(definitionExt)) {
            return true;
        }
    }
    return false;
}
/**
 * Upper cases the first character or the string
 */
function upperCaseFirst(str) {
    return str[0].toUpperCase() + str.slice(1);
}
function arrayGroupByToMap(array, getKey) {
    const groups = new Map();
    for (const item of array) {
        const key = getKey(item);
        const existing = groups.get(key);
        if (existing) {
            existing.push(item);
        }
        else {
            groups.set(key, [item]);
        }
    }
    return groups;
}
function arraysAreEqual(a, b, eq) {
    return (a === b ||
        (a !== undefined &&
            b !== undefined &&
            a.length === b.length &&
            a.every((x, idx) => eq(x, b[idx]))));
}
/** Returns the first non-`undefined` result. */
function findFirstResult(inputs, getResult) {
    for (const element of inputs) {
        const result = getResult(element);
        if (result !== undefined) {
            return result;
        }
    }
    return undefined;
}
/**
 * Gets a string representation of the name of the index signature.
 */
function getNameFromIndexSignature(node) {
    const propName = node.parameters.find((parameter) => parameter.type === utils_1.AST_NODE_TYPES.Identifier);
    return propName ? propName.name : '(index signature)';
}
var MemberNameType;
(function (MemberNameType) {
    MemberNameType[MemberNameType["Private"] = 1] = "Private";
    MemberNameType[MemberNameType["Quoted"] = 2] = "Quoted";
    MemberNameType[MemberNameType["Normal"] = 3] = "Normal";
    MemberNameType[MemberNameType["Expression"] = 4] = "Expression";
})(MemberNameType || (exports.MemberNameType = MemberNameType = {}));
/**
 * Gets a string name representation of the name of the given MethodDefinition
 * or PropertyDefinition node, with handling for computed property names.
 */
function getNameFromMember(member, sourceCode) {
    if (member.key.type === utils_1.AST_NODE_TYPES.Identifier) {
        return {
            type: MemberNameType.Normal,
            name: member.key.name,
        };
    }
    if (member.key.type === utils_1.AST_NODE_TYPES.PrivateIdentifier) {
        return {
            type: MemberNameType.Private,
            name: `#${member.key.name}`,
        };
    }
    if (member.key.type === utils_1.AST_NODE_TYPES.Literal) {
        const name = `${member.key.value}`;
        if ((0, type_utils_1.requiresQuoting)(name)) {
            return {
                type: MemberNameType.Quoted,
                name: `"${name}"`,
            };
        }
        return {
            type: MemberNameType.Normal,
            name,
        };
    }
    return {
        type: MemberNameType.Expression,
        name: sourceCode.text.slice(...member.key.range),
    };
}
function getEnumNames(myEnum) {
    return Object.keys(myEnum).filter(x => isNaN(Number(x)));
}
/**
 * Given an array of words, returns an English-friendly concatenation, separated with commas, with
 * the `and` clause inserted before the last item.
 *
 * Example: ['foo', 'bar', 'baz' ] returns the string "foo, bar, and baz".
 */
function formatWordList(words) {
    if (!words.length) {
        return '';
    }
    if (words.length === 1) {
        return words[0];
    }
    return [words.slice(0, -1).join(', '), words.slice(-1)[0]].join(' and ');
}
/**
 * Iterates the array in reverse and returns the index of the first element it
 * finds which passes the predicate function.
 *
 * @returns Returns the index of the element if it finds it or -1 otherwise.
 */
function findLastIndex(members, predicate) {
    let idx = members.length - 1;
    while (idx >= 0) {
        const valid = predicate(members[idx]);
        if (valid) {
            return idx;
        }
        idx--;
    }
    return -1;
}
function typeNodeRequiresParentheses(node, text) {
    return (node.type === utils_1.AST_NODE_TYPES.TSFunctionType ||
        node.type === utils_1.AST_NODE_TYPES.TSConstructorType ||
        node.type === utils_1.AST_NODE_TYPES.TSConditionalType ||
        (node.type === utils_1.AST_NODE_TYPES.TSUnionType && text.startsWith('|')) ||
        (node.type === utils_1.AST_NODE_TYPES.TSIntersectionType && text.startsWith('&')));
}
function isRestParameterDeclaration(decl) {
    return ts.isParameter(decl) && decl.dotDotDotToken != null;
}
function isParenlessArrowFunction(node, sourceCode) {
    return (node.params.length === 1 && !(0, astUtils_1.isParenthesized)(node.params[0], sourceCode));
}
//# sourceMappingURL=misc.js.map