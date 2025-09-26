/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { hasBooleanType } from '../types-util.js';
import { InterfaceType, UnionType, isArrayType } from './types.js';
export function isPlainInterface(type) {
    return !isPlainUnion(type);
}
export function isPlainUnion(type) {
    return 'type' in type;
}
export function isPlainReferenceType(propertyType) {
    return 'referenceType' in propertyType;
}
export function isPlainArrayType(propertyType) {
    return 'elementType' in propertyType;
}
export function isPlainPropertyUnion(propertyType) {
    return 'types' in propertyType;
}
export function isPlainValueType(propertyType) {
    return 'value' in propertyType;
}
export function isPlainPrimitiveType(propertyType) {
    return 'primitive' in propertyType;
}
export function isPlainStringType(propertyType) {
    return 'string' in propertyType;
}
export function plainToTypes(plain) {
    const interfaceTypes = new Map();
    const unionTypes = new Map();
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
        const type = interfaceTypes.get(interfaceValue.name);
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
        const type = unionTypes.get(unionValue.name);
        type.type = plainToPropertyType(unionValue.type, type, interfaceTypes, unionTypes);
    }
    return {
        interfaces: Array.from(interfaceTypes.values()),
        unions: Array.from(unionTypes.values())
    };
}
function plainToProperty(property, interfaces, unions) {
    const prop = {
        name: property.name,
        optional: property.optional,
        astNodes: property.astNodes,
        type: plainToPropertyType(property.type, undefined, interfaces, unions)
    };
    if (property.defaultValue !== undefined) {
        prop.defaultValue = property.defaultValue;
    }
    else if (hasBooleanType(prop.type)) {
        prop.defaultValue = false;
    }
    else if (isArrayType(prop.type)) {
        prop.defaultValue = [];
    }
    return prop;
}
function plainToPropertyType(type, union, interfaces, unions) {
    if (isPlainArrayType(type)) {
        return {
            elementType: plainToPropertyType(type.elementType, union, interfaces, unions)
        };
    }
    else if (isPlainReferenceType(type)) {
        return {
            referenceType: plainToPropertyType(type.referenceType, undefined, interfaces, unions)
        };
    }
    else if (isPlainPropertyUnion(type)) {
        return {
            types: type.types.map(e => plainToPropertyType(e, union, interfaces, unions))
        };
    }
    else if (isPlainStringType(type)) {
        return {
            string: type.string
        };
    }
    else if (isPlainPrimitiveType(type)) {
        return {
            primitive: type.primitive,
            regex: type.regex
        };
    }
    else if (isPlainValueType(type)) {
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
    }
    else {
        throw new Error('Invalid property type');
    }
}
export function mergePropertyTypes(first, second) {
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
    }
    else {
        return {
            types: flattenedUnion
        };
    }
}
function mergeTypeUnion(first, second) {
    const result = [...first];
    for (const type of second) {
        if (!includesType(result, type)) {
            result.push(type);
        }
    }
    return result;
}
function includesType(list, value) {
    return list.some(e => typeEquals(e, value));
}
function typeEquals(first, second) {
    if (isPlainArrayType(first) && isPlainArrayType(second)) {
        return typeEquals(first.elementType, second.elementType);
    }
    else if (isPlainReferenceType(first) && isPlainReferenceType(second)) {
        return typeEquals(first.referenceType, second.referenceType);
    }
    else if (isPlainValueType(first) && isPlainValueType(second)) {
        return first.value === second.value;
    }
    else if (isPlainPrimitiveType(first) && isPlainPrimitiveType(second)) {
        return first.primitive === second.primitive;
    }
    else {
        return false;
    }
}
export function flattenPlainType(type) {
    if (isPlainPropertyUnion(type)) {
        const flattened = type.types.flatMap(e => flattenPlainType(e));
        return {
            union: flattened.map(e => e.union).flat(),
            array: flattened.map(e => e.array).flat()
        };
    }
    else if (isPlainArrayType(type)) {
        return {
            array: flattenPlainType(type.elementType).union,
            union: []
        };
    }
    else {
        return {
            array: [],
            union: [type]
        };
    }
}
//# sourceMappingURL=plain-types.js.map