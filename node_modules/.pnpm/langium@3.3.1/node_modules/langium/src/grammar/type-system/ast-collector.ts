/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { Grammar } from '../../languages/generated/ast.js';
import type { LangiumDocuments } from '../../workspace/documents.js';
import type { AstTypes, InterfaceType, PropertyType, TypeOption, UnionType } from './type-collector/types.js';
import type { ValidationAstTypes } from './type-collector/all-types.js';
import type { PlainAstTypes, PlainInterface, PlainUnion } from './type-collector/plain-types.js';
import { findAstTypes, sortInterfacesTopologically } from './types-util.js';
import { isInterfaceType, isPrimitiveType, isPropertyUnion, isStringType, isUnionType, isValueType } from './type-collector/types.js';
import { collectTypeResources } from './type-collector/all-types.js';
import { plainToTypes } from './type-collector/plain-types.js';

/**
 * Collects all types for the generated AST. The types collector entry point.
 *
 * @param grammars All grammars involved in the type generation process
 * @param documents Additional documents so that imports can be resolved as necessary
 */
export function collectAst(grammars: Grammar | Grammar[], documents?: LangiumDocuments): AstTypes {
    const { inferred, declared } = collectTypeResources(grammars, documents);
    return createAstTypes(inferred, declared);
}

/**
 * Collects all types used during the validation process.
 * The validation process requires us to compare our inferred types with our declared types.
 *
 * @param grammars All grammars involved in the validation process
 * @param documents Additional documents so that imports can be resolved as necessary
 */
export function collectValidationAst(grammars: Grammar | Grammar[], documents?: LangiumDocuments): ValidationAstTypes {
    const { inferred, declared, astResources } = collectTypeResources(grammars, documents);

    return {
        astResources,
        inferred: createAstTypes(declared, inferred),
        declared: createAstTypes(inferred, declared)
    };
}

export function createAstTypes(first: PlainAstTypes, second?: PlainAstTypes): AstTypes {
    const astTypes: PlainAstTypes = {
        interfaces: sortInterfacesTopologically(mergeAndRemoveDuplicates<PlainInterface>(...first.interfaces, ...second?.interfaces ?? [])),
        unions: mergeAndRemoveDuplicates<PlainUnion>(...first.unions, ...second?.unions ?? []),
    };

    const finalTypes = plainToTypes(astTypes);
    specifyAstNodeProperties(finalTypes);
    return finalTypes;
}

/**
 * Merges the lists of given elements into a single list and removes duplicates. Elements later in the lists get precedence over earlier elements.
 *
 * The distinction is performed over the `name` property of the element. The result is a name-sorted list of elements.
 */
function mergeAndRemoveDuplicates<T extends { name: string }>(...elements: T[]): T[] {
    return Array.from(elements
        .reduce((acc, type) => { acc.set(type.name, type); return acc; }, new Map<string, T>())
        .values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function specifyAstNodeProperties(astTypes: AstTypes) {
    const nameToType = filterInterfaceLikeTypes(astTypes);
    const array = Array.from(nameToType.values());
    addSubTypes(array);
    buildContainerTypes(astTypes.interfaces);
    buildTypeNames(array);
}

function buildTypeNames(types: TypeOption[]) {
    // Recursively collect all subtype names
    const visited = new Set<TypeOption>();
    const collect = (type: TypeOption): void => {
        if (visited.has(type)) return;
        visited.add(type);
        type.typeNames.add(type.name);
        for (const subtype of type.subTypes) {
            collect(subtype);
            subtype.typeNames.forEach(n => type.typeNames.add(n));
        }
    };
    types.forEach(collect);
}

/**
 * Removes union types that reference only to primitive types or
 * types that reference only to primitive types.
 */
function filterInterfaceLikeTypes({ interfaces, unions }: AstTypes): Map<string, TypeOption> {
    const nameToType = (interfaces as TypeOption[]).concat(unions)
        .reduce((acc, e) => { acc.set(e.name, e); return acc; }, new Map<string, TypeOption>());

    const cache = new Map<UnionType, boolean>();

    for (const union of unions) {
        cache.set(union, isDataType(union.type, new Set()));
    }
    for (const [union, isDataType] of cache) {
        if (isDataType) {
            nameToType.delete(union.name);
        }
    }
    return nameToType;
}

function isDataType(property: PropertyType, visited: Set<PropertyType>): boolean {
    if (visited.has(property)) {
        return true;
    }
    visited.add(property);
    if (isPropertyUnion(property)) {
        return property.types.every(e => isDataType(e, visited));
    } else if (isValueType(property)) {
        const value = property.value;
        if (isUnionType(value)) {
            return isDataType(value.type, visited);
        } else {
            return false;
        }
    } else {
        return isPrimitiveType(property) || isStringType(property);
    }
}

function addSubTypes(types: TypeOption[]) {
    for (const interfaceType of types) {
        for (const superTypeName of interfaceType.superTypes) {
            superTypeName.subTypes.add(interfaceType);
        }
    }
}

/**
 * Builds types of `$container` property.
 * @param interfaces Interfaces for which container types are calculated.
 */
function buildContainerTypes(interfaces: InterfaceType[]) {
    const nameToInterface = interfaces
        .reduce((acc, type) => { acc.set(type.name, type);  return acc; },
            new Map<string, InterfaceType>()
        );

    // 1st stage: collect container types

    for (const containerType of interfaces) {
        const types = containerType.properties.flatMap(property => findAstTypes(property.type));
        for (const type of types) {
            nameToInterface.get(type)?.containerTypes.add(containerType);
        }
    }

    // 2nd stage: lift the container types of containers to parents

    // if one of the children has no container types, the parent also loses container types
    // contains type names that have children and at least one of them has no container types
    const emptyContainerTypes: Set<string> = new Set();

    const queue: InterfaceType[] = interfaces.filter(interf => interf.subTypes.size === 0);
    const visited: Set<InterfaceType> = new Set(queue);

    while (queue.length > 0) {
        const interf = queue.shift();
        if (interf) {
            for (const superType of interf.superTypes) {
                if (isInterfaceType(superType)) {
                    if (interf.containerTypes.size === 0) {
                        emptyContainerTypes.add(superType.name);
                        superType.containerTypes.clear();
                    } else if (!emptyContainerTypes.has(superType.name)) {
                        interf.containerTypes.forEach(e => superType.containerTypes.add(e));
                    }

                    if (!visited.has(superType)) {
                        visited.add(superType);
                        queue.push(superType);
                    }
                }
            }
        }
    }
}
