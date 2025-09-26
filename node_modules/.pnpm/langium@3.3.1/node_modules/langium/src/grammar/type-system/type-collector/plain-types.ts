/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { Action, Assignment, TypeAttribute } from '../../../languages/generated/ast.js';
import { hasBooleanType } from '../types-util.js';
import type { AstTypes, Property, PropertyType } from './types.js';
import { InterfaceType, UnionType, isArrayType } from './types.js';

export interface PlainAstTypes {
    interfaces: PlainInterface[];
    unions: PlainUnion[];
}

export type PlainType = PlainInterface | PlainUnion;

export interface PlainInterface {
    name: string;
    superTypes: Set<string>;
    subTypes: Set<string>;
    properties: PlainProperty[];
    declared: boolean;
    abstract: boolean;
}

export function isPlainInterface(type: PlainType): type is PlainInterface {
    return !isPlainUnion(type);
}

export interface PlainUnion {
    name: string;
    superTypes: Set<string>;
    subTypes: Set<string>;
    type: PlainPropertyType;
    declared: boolean;
    dataType?: string;
}

export function isPlainUnion(type: PlainType): type is PlainUnion {
    return 'type' in type;
}

export interface PlainProperty {
    name: string;
    optional: boolean;
    astNodes: Set<Assignment | Action | TypeAttribute>;
    type: PlainPropertyType;
    defaultValue?: PlainPropertyDefaultValue;
}

export type PlainPropertyDefaultValue = string | number | boolean | PlainPropertyDefaultValue[];

export type PlainPropertyType =
    | PlainReferenceType
    | PlainArrayType
    | PlainPropertyUnion
    | PlainValueType
    | PlainPrimitiveType
    | PlainStringType;

export interface PlainReferenceType {
    referenceType: PlainPropertyType;
}

export function isPlainReferenceType(propertyType: PlainPropertyType): propertyType is PlainReferenceType {
    return 'referenceType' in propertyType;
}

export interface PlainArrayType {
    elementType: PlainPropertyType;
}

export function isPlainArrayType(propertyType: PlainPropertyType): propertyType is PlainArrayType {
    return 'elementType' in propertyType;
}

export interface PlainPropertyUnion {
    types: PlainPropertyType[];
}

export function isPlainPropertyUnion(propertyType: PlainPropertyType): propertyType is PlainPropertyUnion {
    return 'types' in propertyType;
}

export interface PlainValueType {
    value: string;
}

export function isPlainValueType(propertyType: PlainPropertyType): propertyType is PlainValueType {
    return 'value' in propertyType;
}

export interface PlainPrimitiveType {
    primitive: string;
    regex?: string;
}

export function isPlainPrimitiveType(propertyType: PlainPropertyType): propertyType is PlainPrimitiveType {
    return 'primitive' in propertyType;
}

export interface PlainStringType {
    string: string;
}

export function isPlainStringType(propertyType: PlainPropertyType): propertyType is PlainStringType {
    return 'string' in propertyType;
}

export function plainToTypes(plain: PlainAstTypes): AstTypes {
    const interfaceTypes = new Map<string, InterfaceType>();
    const unionTypes = new Map<string, UnionType>();
    for (const interfaceValue of plain.interfaces) {
        const type = new InterfaceType(interfaceValue.name, interfaceValue.declared, interfaceValue.abstract);
        interfaceTypes.set(interfaceValue.name, type);
    }
    for (const unionValue of plain.unions) {
        const type = new UnionType(unionValue.name, {
            declared: unionValue.declared,
            dataType: unionValue.dataType
        });
        unionTypes.set(unionValue.name, type);
    }
    for (const interfaceValue of plain.interfaces) {
        const type = interfaceTypes.get(interfaceValue.name)!;
        for (const superTypeName of interfaceValue.superTypes) {
            const superType = interfaceTypes.get(superTypeName) || unionTypes.get(superTypeName);
            if (superType) {
                type.superTypes.add(superType);
            }
        }
        for (const subTypeName of interfaceValue.subTypes) {
            const subType = interfaceTypes.get(subTypeName) || unionTypes.get(subTypeName);
            if (subType) {
                type.subTypes.add(subType);
            }
        }
        for (const property of interfaceValue.properties) {
            const prop = plainToProperty(property, interfaceTypes, unionTypes);
            type.properties.push(prop);
        }
    }
    for (const unionValue of plain.unions) {
        const type = unionTypes.get(unionValue.name)!;
        type.type = plainToPropertyType(unionValue.type, type, interfaceTypes, unionTypes);
    }
    return {
        interfaces: Array.from(interfaceTypes.values()),
        unions: Array.from(unionTypes.values())
    };
}

function plainToProperty(property: PlainProperty, interfaces: Map<string, InterfaceType>, unions: Map<string, UnionType>): Property {
    const prop: Property = {
        name: property.name,
        optional: property.optional,
        astNodes: property.astNodes,
        type: plainToPropertyType(property.type, undefined, interfaces, unions)
    };
    if (property.defaultValue !== undefined) {
        prop.defaultValue = property.defaultValue;
    } else if (hasBooleanType(prop.type)) {
        prop.defaultValue = false;
    } else if (isArrayType(prop.type)) {
        prop.defaultValue = [];
    }
    return prop;
}

function plainToPropertyType(type: PlainPropertyType, union: UnionType | undefined, interfaces: Map<string, InterfaceType>, unions: Map<string, UnionType>): PropertyType {
    if (isPlainArrayType(type)) {
        return {
            elementType: plainToPropertyType(type.elementType, union, interfaces, unions)
        };
    } else if (isPlainReferenceType(type)) {
        return {
            referenceType: plainToPropertyType(type.referenceType, undefined, interfaces, unions)
        };
    } else if (isPlainPropertyUnion(type)) {
        return {
            types: type.types.map(e => plainToPropertyType(e, union, interfaces, unions))
        };
    } else if (isPlainStringType(type)) {
        return {
            string: type.string
        };
    } else if (isPlainPrimitiveType(type)) {
        return {
            primitive: type.primitive,
            regex: type.regex
        };
    } else if (isPlainValueType(type)) {
        const value = interfaces.get(type.value) || unions.get(type.value);
        if (!value) {
            return {
                primitive: 'unknown'
            };
        }
        if (union) {
            union.subTypes.add(value);
        }
        return {
            value
        };
    } else {
        throw new Error('Invalid property type');
    }
}

export function mergePropertyTypes(first: PlainPropertyType, second: PlainPropertyType): PlainPropertyType {
    const { union: flattenedFirstUnion, array: flattenedFirstArray } = flattenPlainType(first);
    const { union: flattenedSecondUnion, array: flattenedSecondArray } = flattenPlainType(second);
    const flattenedUnion = mergeTypeUnion(flattenedFirstUnion, flattenedSecondUnion);
    const flattenedArray = mergeTypeUnion(flattenedFirstArray, flattenedSecondArray);
    if (flattenedArray.length > 0) {
        flattenedUnion.push({
            elementType: flattenedArray.length === 1 ? flattenedArray[0] : {
                types: flattenedArray
            }
        });
    }
    if (flattenedUnion.length === 1) {
        return flattenedUnion[0];
    } else {
        return {
            types: flattenedUnion
        };
    }
}

function mergeTypeUnion(first: PlainPropertyType[], second: PlainPropertyType[]): PlainPropertyType[] {
    const result = [...first];
    for (const type of second) {
        if (!includesType(result, type)) {
            result.push(type);
        }
    }
    return result;
}

function includesType(list: PlainPropertyType[], value: PlainPropertyType): boolean {
    return list.some(e => typeEquals(e, value));
}

function typeEquals(first: PlainPropertyType, second: PlainPropertyType): boolean {
    if (isPlainArrayType(first) && isPlainArrayType(second)) {
        return typeEquals(first.elementType, second.elementType);
    } else if (isPlainReferenceType(first) && isPlainReferenceType(second)) {
        return typeEquals(first.referenceType, second.referenceType);
    } else if (isPlainValueType(first) && isPlainValueType(second)) {
        return first.value === second.value;
    } else if (isPlainPrimitiveType(first) && isPlainPrimitiveType(second)) {
        return first.primitive === second.primitive;
    } else {
        return false;
    }
}

export function flattenPlainType(type: PlainPropertyType): { union: PlainPropertyType[], array: PlainPropertyType[] } {
    if (isPlainPropertyUnion(type)) {
        const flattened = type.types.flatMap(e => flattenPlainType(e));
        return {
            union: flattened.map(e => e.union).flat(),
            array: flattened.map(e => e.array).flat()
        };
    } else if (isPlainArrayType(type)) {
        return {
            array: flattenPlainType(type.elementType).union,
            union: []
        };
    } else {
        return {
            array: [],
            union: [type]
        };
    }
}
