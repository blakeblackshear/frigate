/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { expandToNode, expandToStringWithNL, joinToNode, toString, type Generated } from '../../../generate/index.js';
import type { CstNode } from '../../../syntax-tree.js';
import type { Action, Assignment, TypeAttribute } from '../../../languages/generated/ast.js';
import { distinctAndSorted, escapeQuotes } from '../types-util.js';

export interface Property {
    name: string;
    optional: boolean;
    type: PropertyType;
    defaultValue?: PropertyDefaultValue;
    astNodes: Set<Assignment | Action | TypeAttribute>;
}

export type PropertyDefaultValue = string | number | boolean | PropertyDefaultValue[];

export type PropertyType =
    | ReferenceType
    | ArrayType
    | PropertyUnion
    | ValueType
    | PrimitiveType
    | StringType;

export interface ReferenceType {
    referenceType: PropertyType
}

export function isReferenceType(propertyType: PropertyType): propertyType is ReferenceType {
    return 'referenceType' in propertyType;
}

export interface ArrayType {
    elementType: PropertyType | undefined
}

export function isArrayType(propertyType: PropertyType): propertyType is ArrayType {
    return 'elementType' in propertyType;
}

export interface PropertyUnion {
    types: PropertyType[]
}

export function isPropertyUnion(propertyType: PropertyType): propertyType is PropertyUnion {
    return 'types' in propertyType;
}

export function flattenPropertyUnion(propertyType: PropertyType): PropertyType[] {
    if (isPropertyUnion(propertyType)) {
        const items: PropertyType[] = [];
        for (const type of propertyType.types) {
            items.push(...flattenPropertyUnion(type));
        }
        return items;
    } else {
        return [propertyType];
    }
}

export interface ValueType {
    value: TypeOption
}

export function isValueType(propertyType: PropertyType): propertyType is ValueType {
    return 'value' in propertyType;
}

export interface PrimitiveType {
    primitive: string
    regex?: string
}

export function isPrimitiveType(propertyType: PropertyType): propertyType is PrimitiveType {
    return 'primitive' in propertyType;
}

export interface StringType {
    string: string
}

export function isStringType(propertyType: PropertyType): propertyType is StringType {
    return 'string' in propertyType;
}

export type AstTypes = {
    interfaces: InterfaceType[],
    unions: UnionType[],
}

export function isUnionType(type: TypeOption): type is UnionType {
    return type && 'type' in type;
}

export function isInterfaceType(type: TypeOption): type is InterfaceType {
    return type && 'properties' in type;
}

export type TypeOption = InterfaceType | UnionType;

export class UnionType {
    name: string;
    type: PropertyType;
    superTypes = new Set<TypeOption>();
    subTypes = new Set<TypeOption>();
    typeNames = new Set<string>();
    declared: boolean;
    dataType?: string;

    constructor(name: string, options?: {
        declared: boolean,
        dataType?: string
    }) {
        this.name = name;
        this.declared = options?.declared ?? false;
        this.dataType = options?.dataType;
    }

    toAstTypesString(reflectionInfo: boolean): string {
        const unionNode = expandToNode`
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

    toDeclaredTypesString(reservedWords: Set<string>): string {
        return expandToStringWithNL`
            type ${escapeReservedWords(this.name, reservedWords)} = ${propertyTypeToString(this.type, 'DeclaredType')};
        `;
    }
}

export class InterfaceType {
    name: string;
    superTypes = new Set<TypeOption>();
    subTypes = new Set<TypeOption>();
    containerTypes = new Set<TypeOption>();
    typeNames = new Set<string>();
    declared = false;
    abstract = false;

    properties: Property[] = [];

    get superProperties(): Property[] {
        return this.getSuperProperties(new Set());
    }

    private getSuperProperties(visited: Set<string>): Property[] {
        if (visited.has(this.name)) {
            return [];
        } else {
            visited.add(this.name);
        }
        const map = new Map<string, Property>();
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

    get allProperties(): Property[] {
        const map = new Map(this.superProperties.map(e => [e.name, e]));
        for (const subType of this.subTypes) {
            this.getSubTypeProperties(subType, map, new Set());
        }
        const superProps = Array.from(map.values());
        return superProps;
    }

    private getSubTypeProperties(type: TypeOption, map: Map<string, Property>, visited: Set<string>): void {
        if (visited.has(this.name)) {
            return;
        } else {
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

    get interfaceSuperTypes(): InterfaceType[] {
        return Array.from(this.superTypes).filter((e): e is InterfaceType => e instanceof InterfaceType);
    }

    constructor(name: string, declared: boolean, abstract: boolean) {
        this.name = name;
        this.declared = declared;
        this.abstract = abstract;
    }

    toAstTypesString(reflectionInfo: boolean): string {
        const interfaceSuperTypes = this.interfaceSuperTypes.map(e => e.name);
        const superTypes = interfaceSuperTypes.length > 0 ? distinctAndSorted([...interfaceSuperTypes]) : ['AstNode'];
        const interfaceNode = expandToNode`
            export interface ${this.name} extends ${superTypes.join(', ')} {
        `.appendNewLine();

        interfaceNode.indent(body => {
            if (this.containerTypes.size > 0) {
                body.append(`readonly $container: ${distinctAndSorted([...this.containerTypes].map(e => e.name)).join(' | ')};`).appendNewLine();
            }
            if (this.typeNames.size > 0) {
                body.append(`readonly $type: ${distinctAndSorted([...this.typeNames]).map(e => `'${e}'`).join(' | ')};`).appendNewLine();
            }
            body.append(
                pushProperties(this.properties, 'AstType')
            );
        });
        interfaceNode.append('}').appendNewLine();

        if (reflectionInfo) {
            interfaceNode
                .appendNewLine()
                .append(addReflectionInfo(this.name));
        }

        return toString(interfaceNode);
    }

    toDeclaredTypesString(reservedWords: Set<string>): string {
        const name = escapeReservedWords(this.name, reservedWords);
        const superTypes = distinctAndSorted(this.interfaceSuperTypes.map(e => e.name)).join(', ');
        return toString(
            expandToNode`
                interface ${name}${superTypes.length > 0 ? ` extends ${superTypes}` : ''} {
                    ${pushProperties(this.properties, 'DeclaredType', reservedWords)}
                }
            `.appendNewLine()
        );
    }
}

export class TypeResolutionError extends Error {
    readonly target: CstNode | undefined;

    constructor(message: string, target: CstNode | undefined) {
        super(message);
        this.name = 'TypeResolutionError';
        this.target = target;
    }

}

export function isTypeAssignable(from: PropertyType, to: PropertyType): boolean {
    return isTypeAssignableInternal(from, to, new Map());
}

function isTypeAssignableInternal(from: PropertyType | undefined, to: PropertyType | undefined, visited: Map<string, boolean>): boolean {
    if (!from) {
        return true;
    } else if (!to) {
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
    } else if (isPropertyUnion(to)) {
        result = to.types.some(toType => isTypeAssignableInternal(from, toType, visited));
    } else if (isValueType(to) && isUnionType(to.value)) {
        if (isValueType(from) && isUnionType(from.value) && to.value.name === from.value.name) {
            result = true;
        } else {
            result = isTypeAssignableInternal(from, to.value.type, visited);
        }
    } else if (isReferenceType(from)) {
        result = isReferenceType(to) && isTypeAssignableInternal(from.referenceType, to.referenceType, visited);
    } else if (isArrayType(from)) {
        result = isArrayType(to) && isTypeAssignableInternal(from.elementType, to.elementType, visited);
    } else if (isValueType(from)) {
        if (isUnionType(from.value)) {
            if (from.value.dataType) {
                // We can test the primitive data type directly
                // This potentially skips a expensive recursive call
                // This also helps in case the computed internal data type does not fit the declared data type
                const primitiveType: PrimitiveType = {
                    primitive: from.value.dataType
                };
                result = isTypeAssignableInternal(primitiveType, to, visited);
            }
            if (!result) {
                result = isTypeAssignableInternal(from.value.type, to, visited);
            }
        } else if (!isValueType(to)) {
            result = false;
        } else if (isUnionType(to.value)) {
            result = isTypeAssignableInternal(from, to.value.type, visited);
        } else {
            result = isInterfaceAssignable(from.value, to.value, new Set());
        }
    } else if (isPrimitiveType(from)) {
        result = isPrimitiveType(to) && from.primitive === to.primitive;
    } else if (isStringType(from)) {
        result = (isPrimitiveType(to) && to.primitive === 'string') || (isStringType(to) && to.string === from.string);
    }
    if (result) {
        visited.set(key, result);
    }
    return result;
}

function isInterfaceAssignable(from: InterfaceType, to: InterfaceType, visited: Set<string>): boolean {
    const key = from.name;
    if (visited.has(key)) {
        return false;
    } else {
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

function propertyTypeToKeyString(type: PropertyType): string {
    if (isReferenceType(type)) {
        return `@(${propertyTypeToKeyString(type.referenceType)})}`;
    } else if (isArrayType(type)) {
        return type.elementType ? `(${propertyTypeToKeyString(type.elementType)})[]` : 'unknown[]';
    } else if (isPropertyUnion(type)) {
        const union = type.types.map(e => propertyTypeToKeyString(e)).join(' | ');
        if (type.types.length <= 1) {
            return `Union<${union}>`;
        }
        return union;
    } else if (isValueType(type)) {
        return `Value<${type.value.name}>`;
    } else if (isPrimitiveType(type)) {
        return type.primitive;
    } else if (isStringType(type)) {
        return `'${type.string}'`;
    }
    throw new Error('Invalid type');
}

export function propertyTypeToString(type?: PropertyType, mode: 'AstType' | 'DeclaredType' = 'AstType'): string {
    if (!type) {
        return 'unknown';
    }
    if (isReferenceType(type)) {
        const refType = propertyTypeToString(type.referenceType, mode);
        return mode === 'AstType' ? `Reference<${refType}>` : `@${typeParenthesis(type.referenceType, refType)}`;
    } else if (isArrayType(type)) {
        const arrayType = propertyTypeToString(type.elementType, mode);
        return mode === 'AstType' ? `Array<${arrayType}>` : `${type.elementType ? typeParenthesis(type.elementType, arrayType) : 'unknown'}[]`;
    } else if (isPropertyUnion(type)) {
        const types = type.types.map(e => typeParenthesis(e, propertyTypeToString(e, mode)));
        return distinctAndSorted(types).join(' | ');
    } else if (isValueType(type)) {
        return type.value.name;
    } else if (isPrimitiveType(type)) {
        return type.primitive;
    } else if (isStringType(type)) {
        const delimiter = mode === 'AstType' ? "'" : '"';
        return `${delimiter}${escapeQuotes(type.string, delimiter)}${delimiter}`;
    }
    throw new Error('Invalid type');
}

function typeParenthesis(type: PropertyType, name: string): string {
    const needsParenthesis = isPropertyUnion(type);
    if (needsParenthesis) {
        name = `(${name})`;
    }
    return name;
}

function pushProperties(
    properties: Property[],
    mode: 'AstType' | 'DeclaredType',
    reserved = new Set<string>()
): Generated {

    function propertyToString(property: Property): string {
        const name = mode === 'AstType' ? property.name : escapeReservedWords(property.name, reserved);
        const optional = property.optional && !isMandatoryPropertyType(property.type);
        const propType = propertyTypeToString(property.type, mode);
        return `${name}${optional ? '?' : ''}: ${propType};`;
    }

    return joinToNode(
        distinctAndSorted(properties, (a, b) => a.name.localeCompare(b.name)),
        propertyToString,
        { appendNewLineIfNotEmpty: true }
    );
}

export function isMandatoryPropertyType(propertyType: PropertyType): boolean {
    if (isArrayType(propertyType)) {
        return true;
    } else if (isReferenceType(propertyType)) {
        return false;
    } else if (isPropertyUnion(propertyType)) {
        return propertyType.types.every(e => isMandatoryPropertyType(e));
    } else if (isPrimitiveType(propertyType)) {
        const value = propertyType.primitive;
        return value === 'boolean';
    } else {
        return false;
    }
}

function addReflectionInfo(name: string): Generated {
    return expandToNode`
        export const ${name} = '${name}';

        export function is${name}(item: unknown): item is ${name} {
            return reflection.isInstance(item, ${name});
        }
    `.appendNewLine();
}

function addDataTypeReflectionInfo(union: UnionType): Generated {
    switch (union.dataType) {
        case 'string':
            if (containsOnlyStringTypes(union.type)) {
                const subTypes = Array.from(union.subTypes).map(e => e.name);
                const strings = collectStringValuesFromDataType(union.type);
                const regexes = collectRegexesFromDataType(union.type);
                if (subTypes.length === 0 && strings.length === 0 && regexes.length === 0) {
                    return generateIsDataTypeFunction(union.name, `typeof item === '${union.dataType}'`);
                } else {
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

function containsOnlyStringTypes(propertyType: PropertyType): boolean {
    let result = true;
    if (isPrimitiveType(propertyType)) {
        if (propertyType.primitive === 'string') {
            return true;
        } else {
            return false;
        }
    } else if (isStringType(propertyType)) {
        return true;
    } else if (!isPropertyUnion(propertyType)) {
        return false;
    } else {
        for (const type of propertyType.types) {
            if (isValueType(type)) {
                if (isUnionType(type.value)) {
                    if (!containsOnlyStringTypes(type.value.type)) {
                        return false;
                    }
                } else {
                    return false;
                }
            } else if (isPrimitiveType(type)) {
                if (type.primitive !== 'string' || !type.regex) {
                    return false;
                }
            } else if (isPropertyUnion(type)) {
                result = containsOnlyStringTypes(type);
            } else if (!isStringType(type)) {
                return false;
            }
        }
    }
    return result;
}

function createDataTypeCheckerFunctionReturnString(subTypes: string[], strings: string[], regexes: string[]): string {
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

function escapeReservedWords(name: string, reserved: Set<string>): string {
    return reserved.has(name) ? `^${name}` : name;
}

function collectStringValuesFromDataType(propertyType: PropertyType): string[] {
    const values: string[] = [];
    if (isStringType(propertyType)) {
        return [propertyType.string];
    }
    if (isPropertyUnion(propertyType)) {
        for (const type of propertyType.types) {
            if (isStringType(type)) {
                values.push(type.string);
            } else if (isPropertyUnion(type)) {
                values.push(...collectStringValuesFromDataType(type));
            }
        }
    }

    return values;
}

function collectRegexesFromDataType(propertyType: PropertyType): string[] {
    const regexes: string[] = [];
    if (isPrimitiveType(propertyType) && propertyType.primitive === 'string' && propertyType.regex) {
        regexes.push(propertyType.regex);
    }
    if (isPropertyUnion(propertyType)) {
        for (const type of propertyType.types) {
            if (isPrimitiveType(type) && type.primitive === 'string' && type.regex) {
                regexes.push(type.regex);
            } else if (isPropertyUnion(type)) {
                regexes.push(...collectRegexesFromDataType(type));
            }
        }
    }
    return regexes;
}

function generateIsDataTypeFunction(unionName: string, returnString: string): Generated {
    return expandToNode`
        export function is${unionName}(item: unknown): item is ${unionName} {
            return ${returnString};
        }
    `.appendNewLine();
}
