/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { CstNode } from '../../../syntax-tree.js';
import type { Action, Assignment, TypeAttribute } from '../../../languages/generated/ast.js';
export interface Property {
    name: string;
    optional: boolean;
    type: PropertyType;
    defaultValue?: PropertyDefaultValue;
    astNodes: Set<Assignment | Action | TypeAttribute>;
}
export type PropertyDefaultValue = string | number | boolean | PropertyDefaultValue[];
export type PropertyType = ReferenceType | ArrayType | PropertyUnion | ValueType | PrimitiveType | StringType;
export interface ReferenceType {
    referenceType: PropertyType;
}
export declare function isReferenceType(propertyType: PropertyType): propertyType is ReferenceType;
export interface ArrayType {
    elementType: PropertyType | undefined;
}
export declare function isArrayType(propertyType: PropertyType): propertyType is ArrayType;
export interface PropertyUnion {
    types: PropertyType[];
}
export declare function isPropertyUnion(propertyType: PropertyType): propertyType is PropertyUnion;
export declare function flattenPropertyUnion(propertyType: PropertyType): PropertyType[];
export interface ValueType {
    value: TypeOption;
}
export declare function isValueType(propertyType: PropertyType): propertyType is ValueType;
export interface PrimitiveType {
    primitive: string;
    regex?: string;
}
export declare function isPrimitiveType(propertyType: PropertyType): propertyType is PrimitiveType;
export interface StringType {
    string: string;
}
export declare function isStringType(propertyType: PropertyType): propertyType is StringType;
export type AstTypes = {
    interfaces: InterfaceType[];
    unions: UnionType[];
};
export declare function isUnionType(type: TypeOption): type is UnionType;
export declare function isInterfaceType(type: TypeOption): type is InterfaceType;
export type TypeOption = InterfaceType | UnionType;
export declare class UnionType {
    name: string;
    type: PropertyType;
    superTypes: Set<TypeOption>;
    subTypes: Set<TypeOption>;
    typeNames: Set<string>;
    declared: boolean;
    dataType?: string;
    constructor(name: string, options?: {
        declared: boolean;
        dataType?: string;
    });
    toAstTypesString(reflectionInfo: boolean): string;
    toDeclaredTypesString(reservedWords: Set<string>): string;
}
export declare class InterfaceType {
    name: string;
    superTypes: Set<TypeOption>;
    subTypes: Set<TypeOption>;
    containerTypes: Set<TypeOption>;
    typeNames: Set<string>;
    declared: boolean;
    abstract: boolean;
    properties: Property[];
    get superProperties(): Property[];
    private getSuperProperties;
    get allProperties(): Property[];
    private getSubTypeProperties;
    get interfaceSuperTypes(): InterfaceType[];
    constructor(name: string, declared: boolean, abstract: boolean);
    toAstTypesString(reflectionInfo: boolean): string;
    toDeclaredTypesString(reservedWords: Set<string>): string;
}
export declare class TypeResolutionError extends Error {
    readonly target: CstNode | undefined;
    constructor(message: string, target: CstNode | undefined);
}
export declare function isTypeAssignable(from: PropertyType, to: PropertyType): boolean;
export declare function propertyTypeToString(type?: PropertyType, mode?: 'AstType' | 'DeclaredType'): string;
export declare function isMandatoryPropertyType(propertyType: PropertyType): boolean;
//# sourceMappingURL=types.d.ts.map