/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { expandToNode, expandToStringWithNL, joinToNode, toString } from '../../../generate/index.js';
import { distinctAndSorted, escapeQuotes } from '../types-util.js';
export function isReferenceType(propertyType) {
    return 'referenceType' in propertyType;
}
export function isArrayType(propertyType) {
    return 'elementType' in propertyType;
}
export function isPropertyUnion(propertyType) {
    return 'types' in propertyType;
}
export function flattenPropertyUnion(propertyType) {
    if (isPropertyUnion(propertyType)) {
        const items = [];
        for (const type of propertyType.types) {
            items.push(...flattenPropertyUnion(type));
        }
        return items;
    }
    else {
        return [propertyType];
    }
}
export function isValueType(propertyType) {
    return 'value' in propertyType;
}
export function isPrimitiveType(propertyType) {
    return 'primitive' in propertyType;
}
export function isStringType(propertyType) {
    return 'string' in propertyType;
}
export function isUnionType(type) {
    return type && 'type' in type;
}
export function isInterfaceType(type) {
    return type && 'properties' in type;
}
export class UnionType {
    constructor(name, options) {
        var _a;
        this.superTypes = new Set();
        this.subTypes = new Set();
        this.typeNames = new Set();
        this.name = name;
        this.declared = (_a = options === null || options === void 0 ? void 0 : options.declared) !== null && _a !== void 0 ? _a : false;
        this.dataType = options === null || options === void 0 ? void 0 : options.dataType;
    }
    toAstTypesString(reflectionInfo) {
        const unionNode = expandToNode `
            export type ${this.name} = ${propertyTypeToString(this.type, 'AstType')};
        `.appendNewLine();
        if (reflectionInfo) {
            unionNode.appendNewLine()
                .append(addReflectionInfo(this.name));
        }
        if (this.dataType) {
            unionNode.appendNewLine()
                .append(addDataTypeReflectionInfo(this));
        }
        return toString(unionNode);
    }
    toDeclaredTypesString(reservedWords) {
        return expandToStringWithNL `
            type ${escapeReservedWords(this.name, reservedWords)} = ${propertyTypeToString(this.type, 'DeclaredType')};
        `;
    }
}
export class InterfaceType {
    get superProperties() {
        return this.getSuperProperties(new Set());
    }
    getSuperProperties(visited) {
        if (visited.has(this.name)) {
            return [];
        }
        else {
            visited.add(this.name);
        }
        const map = new Map();
        for (const property of this.properties) {
            map.set(property.name, property);
        }
        for (const superType of this.interfaceSuperTypes) {
            const allSuperProperties = superType.getSuperProperties(visited);
            for (const superProp of allSuperProperties) {
                if (!map.has(superProp.name)) {
                    map.set(superProp.name, superProp);
                }
            }
        }
        return Array.from(map.values());
    }
    get allProperties() {
        const map = new Map(this.superProperties.map(e => [e.name, e]));
        for (const subType of this.subTypes) {
            this.getSubTypeProperties(subType, map, new Set());
        }
        const superProps = Array.from(map.values());
        return superProps;
    }
    getSubTypeProperties(type, map, visited) {
        if (visited.has(this.name)) {
            return;
        }
        else {
            visited.add(this.name);
        }
        const props = isInterfaceType(type) ? type.properties : [];
        for (const prop of props) {
            if (!map.has(prop.name)) {
                map.set(prop.name, prop);
            }
        }
        for (const subType of type.subTypes) {
            this.getSubTypeProperties(subType, map, visited);
        }
    }
    get interfaceSuperTypes() {
        return Array.from(this.superTypes).filter((e) => e instanceof InterfaceType);
    }
    constructor(name, declared, abstract) {
        this.superTypes = new Set();
        this.subTypes = new Set();
        this.containerTypes = new Set();
        this.typeNames = new Set();
        this.declared = false;
        this.abstract = false;
        this.properties = [];
        this.name = name;
        this.declared = declared;
        this.abstract = abstract;
    }
    toAstTypesString(reflectionInfo) {
        const interfaceSuperTypes = this.interfaceSuperTypes.map(e => e.name);
        const superTypes = interfaceSuperTypes.length > 0 ? distinctAndSorted([...interfaceSuperTypes]) : ['AstNode'];
        const interfaceNode = expandToNode `
            export interface ${this.name} extends ${superTypes.join(', ')} {
        `.appendNewLine();
        interfaceNode.indent(body => {
            if (this.containerTypes.size > 0) {
                body.append(`readonly $container: ${distinctAndSorted([...this.containerTypes].map(e => e.name)).join(' | ')};`).appendNewLine();
            }
            if (this.typeNames.size > 0) {
                body.append(`readonly $type: ${distinctAndSorted([...this.typeNames]).map(e => `'${e}'`).join(' | ')};`).appendNewLine();
            }
            body.append(pushProperties(this.properties, 'AstType'));
        });
        interfaceNode.append('}').appendNewLine();
        if (reflectionInfo) {
            interfaceNode
                .appendNewLine()
                .append(addReflectionInfo(this.name));
        }
        return toString(interfaceNode);
    }
    toDeclaredTypesString(reservedWords) {
        const name = escapeReservedWords(this.name, reservedWords);
        const superTypes = distinctAndSorted(this.interfaceSuperTypes.map(e => e.name)).join(', ');
        return toString(expandToNode `
                interface ${name}${superTypes.length > 0 ? ` extends ${superTypes}` : ''} {
                    ${pushProperties(this.properties, 'DeclaredType', reservedWords)}
                }
            `.appendNewLine());
    }
}
export class TypeResolutionError extends Error {
    constructor(message, target) {
        super(message);
        this.name = 'TypeResolutionError';
        this.target = target;
    }
}
export function isTypeAssignable(from, to) {
    return isTypeAssignableInternal(from, to, new Map());
}
function isTypeAssignableInternal(from, to, visited) {
    if (!from) {
        return true;
    }
    else if (!to) {
        return false;
    }
    const key = `${propertyTypeToKeyString(from)}»${propertyTypeToKeyString(to)}`;
    let result = visited.get(key);
    if (result !== undefined) {
        return result;
    }
    visited.set(key, false);
    result = false;
    if (isPropertyUnion(from)) {
        result = from.types.every(fromType => isTypeAssignableInternal(fromType, to, visited));
    }
    else if (isPropertyUnion(to)) {
        result = to.types.some(toType => isTypeAssignableInternal(from, toType, visited));
    }
    else if (isValueType(to) && isUnionType(to.value)) {
        if (isValueType(from) && isUnionType(from.value) && to.value.name === from.value.name) {
            result = true;
        }
        else {
            result = isTypeAssignableInternal(from, to.value.type, visited);
        }
    }
    else if (isReferenceType(from)) {
        result = isReferenceType(to) && isTypeAssignableInternal(from.referenceType, to.referenceType, visited);
    }
    else if (isArrayType(from)) {
        result = isArrayType(to) && isTypeAssignableInternal(from.elementType, to.elementType, visited);
    }
    else if (isValueType(from)) {
        if (isUnionType(from.value)) {
            if (from.value.dataType) {
                // We can test the primitive data type directly
                // This potentially skips a expensive recursive call
                // This also helps in case the computed internal data type does not fit the declared data type
                const primitiveType = {
                    primitive: from.value.dataType
                };
                result = isTypeAssignableInternal(primitiveType, to, visited);
            }
            if (!result) {
                result = isTypeAssignableInternal(from.value.type, to, visited);
            }
        }
        else if (!isValueType(to)) {
            result = false;
        }
        else if (isUnionType(to.value)) {
            result = isTypeAssignableInternal(from, to.value.type, visited);
        }
        else {
            result = isInterfaceAssignable(from.value, to.value, new Set());
        }
    }
    else if (isPrimitiveType(from)) {
        result = isPrimitiveType(to) && from.primitive === to.primitive;
    }
    else if (isStringType(from)) {
        result = (isPrimitiveType(to) && to.primitive === 'string') || (isStringType(to) && to.string === from.string);
    }
    if (result) {
        visited.set(key, result);
    }
    return result;
}
function isInterfaceAssignable(from, to, visited) {
    const key = from.name;
    if (visited.has(key)) {
        return false;
    }
    else {
        visited.add(key);
    }
    if (from.name === to.name) {
        return true;
    }
    for (const superType of from.superTypes) {
        if (isInterfaceType(superType) && isInterfaceAssignable(superType, to, visited)) {
            return true;
        }
    }
    return false;
}
function propertyTypeToKeyString(type) {
    if (isReferenceType(type)) {
        return `@(${propertyTypeToKeyString(type.referenceType)})}`;
    }
    else if (isArrayType(type)) {
        return type.elementType ? `(${propertyTypeToKeyString(type.elementType)})[]` : 'unknown[]';
    }
    else if (isPropertyUnion(type)) {
        const union = type.types.map(e => propertyTypeToKeyString(e)).join(' | ');
        if (type.types.length <= 1) {
            return `Union<${union}>`;
        }
        return union;
    }
    else if (isValueType(type)) {
        return `Value<${type.value.name}>`;
    }
    else if (isPrimitiveType(type)) {
        return type.primitive;
    }
    else if (isStringType(type)) {
        return `'${type.string}'`;
    }
    throw new Error('Invalid type');
}
export function propertyTypeToString(type, mode = 'AstType') {
    if (!type) {
        return 'unknown';
    }
    if (isReferenceType(type)) {
        const refType = propertyTypeToString(type.referenceType, mode);
        return mode === 'AstType' ? `Reference<${refType}>` : `@${typeParenthesis(type.referenceType, refType)}`;
    }
    else if (isArrayType(type)) {
        const arrayType = propertyTypeToString(type.elementType, mode);
        return mode === 'AstType' ? `Array<${arrayType}>` : `${type.elementType ? typeParenthesis(type.elementType, arrayType) : 'unknown'}[]`;
    }
    else if (isPropertyUnion(type)) {
        const types = type.types.map(e => typeParenthesis(e, propertyTypeToString(e, mode)));
        return distinctAndSorted(types).join(' | ');
    }
    else if (isValueType(type)) {
        return type.value.name;
    }
    else if (isPrimitiveType(type)) {
        return type.primitive;
    }
    else if (isStringType(type)) {
        const delimiter = mode === 'AstType' ? "'" : '"';
        return `${delimiter}${escapeQuotes(type.string, delimiter)}${delimiter}`;
    }
    throw new Error('Invalid type');
}
function typeParenthesis(type, name) {
    const needsParenthesis = isPropertyUnion(type);
    if (needsParenthesis) {
        name = `(${name})`;
    }
    return name;
}
function pushProperties(properties, mode, reserved = new Set()) {
    function propertyToString(property) {
        const name = mode === 'AstType' ? property.name : escapeReservedWords(property.name, reserved);
        const optional = property.optional && !isMandatoryPropertyType(property.type);
        const propType = propertyTypeToString(property.type, mode);
        return `${name}${optional ? '?' : ''}: ${propType};`;
    }
    return joinToNode(distinctAndSorted(properties, (a, b) => a.name.localeCompare(b.name)), propertyToString, { appendNewLineIfNotEmpty: true });
}
export function isMandatoryPropertyType(propertyType) {
    if (isArrayType(propertyType)) {
        return true;
    }
    else if (isReferenceType(propertyType)) {
        return false;
    }
    else if (isPropertyUnion(propertyType)) {
        return propertyType.types.every(e => isMandatoryPropertyType(e));
    }
    else if (isPrimitiveType(propertyType)) {
        const value = propertyType.primitive;
        return value === 'boolean';
    }
    else {
        return false;
    }
}
function addReflectionInfo(name) {
    return expandToNode `
        export const ${name} = '${name}';

        export function is${name}(item: unknown): item is ${name} {
            return reflection.isInstance(item, ${name});
        }
    `.appendNewLine();
}
function addDataTypeReflectionInfo(union) {
    switch (union.dataType) {
        case 'string':
            if (containsOnlyStringTypes(union.type)) {
                const subTypes = Array.from(union.subTypes).map(e => e.name);
                const strings = collectStringValuesFromDataType(union.type);
                const regexes = collectRegexesFromDataType(union.type);
                if (subTypes.length === 0 && strings.length === 0 && regexes.length === 0) {
                    return generateIsDataTypeFunction(union.name, `typeof item === '${union.dataType}'`);
                }
                else {
                    const returnString = createDataTypeCheckerFunctionReturnString(subTypes, strings, regexes);
                    return generateIsDataTypeFunction(union.name, returnString);
                }
            }
            return;
        case 'number':
        case 'boolean':
        case 'bigint':
            return generateIsDataTypeFunction(union.name, `typeof item === '${union.dataType}'`);
        case 'Date':
            return generateIsDataTypeFunction(union.name, 'item instanceof Date');
        default:
            return;
    }
}
function containsOnlyStringTypes(propertyType) {
    let result = true;
    if (isPrimitiveType(propertyType)) {
        if (propertyType.primitive === 'string') {
            return true;
        }
        else {
            return false;
        }
    }
    else if (isStringType(propertyType)) {
        return true;
    }
    else if (!isPropertyUnion(propertyType)) {
        return false;
    }
    else {
        for (const type of propertyType.types) {
            if (isValueType(type)) {
                if (isUnionType(type.value)) {
                    if (!containsOnlyStringTypes(type.value.type)) {
                        return false;
                    }
                }
                else {
                    return false;
                }
            }
            else if (isPrimitiveType(type)) {
                if (type.primitive !== 'string' || !type.regex) {
                    return false;
                }
            }
            else if (isPropertyUnion(type)) {
                result = containsOnlyStringTypes(type);
            }
            else if (!isStringType(type)) {
                return false;
            }
        }
    }
    return result;
}
function createDataTypeCheckerFunctionReturnString(subTypes, strings, regexes) {
    const allArray = [
        ...subTypes.map(e => `is${e}(item)`),
        ...strings.map(e => `item === '${e}'`)
    ];
    if (regexes.length > 0) {
        const joinedRegexes = regexes.map(e => `${e}.test(item)`).join(' || ');
        allArray.push(`(typeof item === 'string' && (${joinedRegexes}))`);
    }
    return allArray.join(' || ');
}
function escapeReservedWords(name, reserved) {
    return reserved.has(name) ? `^${name}` : name;
}
function collectStringValuesFromDataType(propertyType) {
    const values = [];
    if (isStringType(propertyType)) {
        return [propertyType.string];
    }
    if (isPropertyUnion(propertyType)) {
        for (const type of propertyType.types) {
            if (isStringType(type)) {
                values.push(type.string);
            }
            else if (isPropertyUnion(type)) {
                values.push(...collectStringValuesFromDataType(type));
            }
        }
    }
    return values;
}
function collectRegexesFromDataType(propertyType) {
    const regexes = [];
    if (isPrimitiveType(propertyType) && propertyType.primitive === 'string' && propertyType.regex) {
        regexes.push(propertyType.regex);
    }
    if (isPropertyUnion(propertyType)) {
        for (const type of propertyType.types) {
            if (isPrimitiveType(type) && type.primitive === 'string' && type.regex) {
                regexes.push(type.regex);
            }
            else if (isPropertyUnion(type)) {
                regexes.push(...collectRegexesFromDataType(type));
            }
        }
    }
    return regexes;
}
function generateIsDataTypeFunction(unionName, returnString) {
    return expandToNode `
        export function is${unionName}(item: unknown): item is ${unionName} {
            return ${returnString};
        }
    `.appendNewLine();
}
//# sourceMappingURL=types.js.map