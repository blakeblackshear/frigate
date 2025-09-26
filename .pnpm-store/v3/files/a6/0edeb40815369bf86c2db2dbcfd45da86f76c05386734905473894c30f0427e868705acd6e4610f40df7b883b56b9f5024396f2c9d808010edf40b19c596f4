/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { Action, Assignment, TypeAttribute } from '../../../languages/generated/ast.js';
import type { AstTypes } from './types.js';
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
export declare function isPlainInterface(type: PlainType): type is PlainInterface;
export interface PlainUnion {
    name: string;
    superTypes: Set<string>;
    subTypes: Set<string>;
    type: PlainPropertyType;
    declared: boolean;
    dataType?: string;
}
export declare function isPlainUnion(type: PlainType): type is PlainUnion;
export interface PlainProperty {
    name: string;
    optional: boolean;
    astNodes: Set<Assignment | Action | TypeAttribute>;
    type: PlainPropertyType;
    defaultValue?: PlainPropertyDefaultValue;
}
export type PlainPropertyDefaultValue = string | number | boolean | PlainPropertyDefaultValue[];
export type PlainPropertyType = PlainReferenceType | PlainArrayType | PlainPropertyUnion | PlainValueType | PlainPrimitiveType | PlainStringType;
export interface PlainReferenceType {
    referenceType: PlainPropertyType;
}
export declare function isPlainReferenceType(propertyType: PlainPropertyType): propertyType is PlainReferenceType;
export interface PlainArrayType {
    elementType: PlainPropertyType;
}
export declare function isPlainArrayType(propertyType: PlainPropertyType): propertyType is PlainArrayType;
export interface PlainPropertyUnion {
    types: PlainPropertyType[];
}
export declare function isPlainPropertyUnion(propertyType: PlainPropertyType): propertyType is PlainPropertyUnion;
export interface PlainValueType {
    value: string;
}
export declare function isPlainValueType(propertyType: PlainPropertyType): propertyType is PlainValueType;
export interface PlainPrimitiveType {
    primitive: string;
    regex?: string;
}
export declare function isPlainPrimitiveType(propertyType: PlainPropertyType): propertyType is PlainPrimitiveType;
export interface PlainStringType {
    string: string;
}
export declare function isPlainStringType(propertyType: PlainPropertyType): propertyType is PlainStringType;
export declare function plainToTypes(plain: PlainAstTypes): AstTypes;
export declare function mergePropertyTypes(first: PlainPropertyType, second: PlainPropertyType): PlainPropertyType;
export declare function flattenPlainType(type: PlainPropertyType): {
    union: PlainPropertyType[];
    array: PlainPropertyType[];
};
//# sourceMappingURL=plain-types.d.ts.map