/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { MultiMap } from '../../utils/collections.js';
import { isInterface, isType, isUnionType, isSimpleType } from '../../languages/generated/ast.js';
import { isArrayType, isPrimitiveType, isPropertyUnion, isReferenceType, isValueType } from './type-collector/types.js';
/**
 * Collects all properties of all interface types. Includes super type properties.
 * @param interfaces A topologically sorted array of interfaces.
 */
export function collectAllPlainProperties(interfaces) {
    const map = new MultiMap();
    for (const interfaceType of interfaces) {
        map.addAll(interfaceType.name, interfaceType.properties);
    }
    for (const interfaceType of interfaces) {
        for (const superType of interfaceType.superTypes) {
            const superTypeProperties = map.get(superType);
            if (superTypeProperties) {
                map.addAll(interfaceType.name, superTypeProperties);
            }
        }
    }
    return map;
}
export function distinctAndSorted(list, compareFn) {
    return Array.from(new Set(list)).sort(compareFn);
}
export function collectChildrenTypes(interfaceNode, references, langiumDocuments, nodeLocator) {
    const childrenTypes = new Set();
    childrenTypes.add(interfaceNode);
    const refs = references.findReferences(interfaceNode, {});
    for (const ref of refs) {
        const doc = langiumDocuments.getDocument(ref.sourceUri);
        if (!doc) {
            continue;
        }
        const astNode = nodeLocator.getAstNode(doc.parseResult.value, ref.sourcePath);
        if (isInterface(astNode)) {
            childrenTypes.add(astNode);
            const childrenOfInterface = collectChildrenTypes(astNode, references, langiumDocuments, nodeLocator);
            childrenOfInterface.forEach(child => childrenTypes.add(child));
        }
        else if (astNode && isType(astNode.$container)) {
            childrenTypes.add(astNode.$container);
        }
    }
    return childrenTypes;
}
export function collectTypeHierarchy(types) {
    const allTypes = new Set(types);
    const duplicateSuperTypes = new MultiMap();
    const duplicateSubTypes = new MultiMap();
    for (const type of allTypes) {
        for (const superType of type.superTypes) {
            if (allTypes.has(superType)) {
                duplicateSuperTypes.add(type.name, superType.name);
                duplicateSubTypes.add(superType.name, type.name);
            }
        }
        for (const subType of type.subTypes) {
            if (allTypes.has(subType)) {
                duplicateSuperTypes.add(subType.name, type.name);
                duplicateSubTypes.add(type.name, subType.name);
            }
        }
    }
    const superTypes = new MultiMap();
    const subTypes = new MultiMap();
    // Deduplicate and sort
    for (const [name, superTypeList] of Array.from(duplicateSuperTypes.entriesGroupedByKey()).sort(([aName], [bName]) => aName.localeCompare(bName))) {
        superTypes.addAll(name, Array.from(new Set(superTypeList)));
    }
    for (const [name, subTypeList] of Array.from(duplicateSubTypes.entriesGroupedByKey()).sort(([aName], [bName]) => aName.localeCompare(bName))) {
        subTypes.addAll(name, Array.from(new Set(subTypeList)));
    }
    return {
        superTypes,
        subTypes
    };
}
export function collectSuperTypes(ruleNode) {
    const superTypes = new Set();
    if (isInterface(ruleNode)) {
        superTypes.add(ruleNode);
        ruleNode.superTypes.forEach(superType => {
            if (isInterface(superType.ref)) {
                superTypes.add(superType.ref);
                const collectedSuperTypes = collectSuperTypes(superType.ref);
                for (const superType of collectedSuperTypes) {
                    superTypes.add(superType);
                }
            }
        });
    }
    else if (isType(ruleNode)) {
        const usedTypes = collectUsedTypes(ruleNode.type);
        for (const usedType of usedTypes) {
            const collectedSuperTypes = collectSuperTypes(usedType);
            for (const superType of collectedSuperTypes) {
                superTypes.add(superType);
            }
        }
    }
    return superTypes;
}
function collectUsedTypes(typeDefinition) {
    var _a;
    if (isUnionType(typeDefinition)) {
        return typeDefinition.types.flatMap(e => collectUsedTypes(e));
    }
    else if (isSimpleType(typeDefinition)) {
        const value = (_a = typeDefinition.typeRef) === null || _a === void 0 ? void 0 : _a.ref;
        if (isType(value) || isInterface(value)) {
            return [value];
        }
    }
    return [];
}
export function mergeInterfaces(inferred, declared) {
    return inferred.interfaces.concat(declared.interfaces);
}
export function mergeTypesAndInterfaces(astTypes) {
    return astTypes.interfaces.concat(astTypes.unions);
}
/**
 * Performs topological sorting on the generated interfaces.
 * @param interfaces The interfaces to sort topologically.
 * @returns A topologically sorted set of interfaces.
 */
export function sortInterfacesTopologically(interfaces) {
    const nodes = interfaces
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(e => ({ value: e, nodes: [] }));
    for (const node of nodes) {
        node.nodes = nodes.filter(e => node.value.superTypes.has(e.value.name));
    }
    const l = [];
    const s = nodes.filter(e => e.nodes.length === 0);
    while (s.length > 0) {
        const n = s.shift();
        if (!l.includes(n)) {
            l.push(n);
            nodes
                .filter(e => e.nodes.includes(n))
                .forEach(m => s.push(m));
        }
    }
    return l.map(e => e.value);
}
export function hasArrayType(type) {
    if (isPropertyUnion(type)) {
        return type.types.some(e => hasArrayType(e));
    }
    else if (isArrayType(type)) {
        return true;
    }
    else {
        return false;
    }
}
export function hasBooleanType(type) {
    if (isPropertyUnion(type)) {
        return type.types.some(e => hasBooleanType(e));
    }
    else if (isPrimitiveType(type)) {
        return type.primitive === 'boolean';
    }
    else {
        return false;
    }
}
export function findReferenceTypes(type) {
    if (isPropertyUnion(type)) {
        return type.types.flatMap(e => findReferenceTypes(e));
    }
    else if (isReferenceType(type)) {
        const refType = type.referenceType;
        if (isValueType(refType)) {
            return [refType.value.name];
        }
    }
    else if (isArrayType(type)) {
        return type.elementType ? findReferenceTypes(type.elementType) : [];
    }
    return [];
}
export function findAstTypes(type) {
    return findAstTypesInternal(type, new Set());
}
function findAstTypesInternal(type, visited) {
    if (visited.has(type)) {
        return [];
    }
    else {
        visited.add(type);
    }
    if (isPropertyUnion(type)) {
        return type.types.flatMap(e => findAstTypesInternal(e, visited));
    }
    else if (isValueType(type)) {
        const value = type.value;
        if ('type' in value) {
            return findAstTypesInternal(value.type, visited);
        }
        else {
            return [value.name];
        }
    }
    else if (isArrayType(type)) {
        return type.elementType ? findAstTypesInternal(type.elementType, visited) : [];
    }
    return [];
}
export function isAstType(type) {
    return isAstTypeInternal(type, new Map());
}
export function isAstTypeInternal(type, visited) {
    if (visited.has(type)) {
        return visited.get(type);
    }
    // This is supposed to prevent infinite recursion.
    // Setting this to true is a pretty safe assumption.
    // Setting it to false might lead to false negatives for property unions.
    visited.set(type, true);
    let result = false;
    if (isPropertyUnion(type)) {
        result = type.types.every(e => isAstTypeInternal(e, visited));
    }
    else if (isValueType(type)) {
        const value = type.value;
        if ('type' in value) {
            result = isAstTypeInternal(value.type, visited);
        }
        else {
            // Is definitely an interface type
            result = true;
        }
    }
    visited.set(type, result);
    return result;
}
export function escapeQuotes(str, type = '"') {
    if (type === '"') {
        return str.replace(/"/g, '\\"');
    }
    else {
        return str.replace(/'/g, "\\'");
    }
}
//# sourceMappingURL=types-util.js.map