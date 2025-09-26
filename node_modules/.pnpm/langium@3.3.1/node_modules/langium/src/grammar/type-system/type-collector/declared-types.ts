/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { Interface, Type, TypeDefinition, ValueLiteral } from '../../../languages/generated/ast.js';
import { isArrayLiteral, isBooleanLiteral } from '../../../languages/generated/ast.js';
import type { PlainAstTypes, PlainInterface, PlainProperty, PlainPropertyDefaultValue, PlainPropertyType, PlainUnion } from './plain-types.js';
import { isArrayType, isReferenceType, isUnionType, isSimpleType } from '../../../languages/generated/ast.js';
import { getTypeNameWithoutError, isPrimitiveGrammarType } from '../../internal-grammar-util.js';
import { getTypeName } from '../../../utils/grammar-utils.js';

export function collectDeclaredTypes(interfaces: Interface[], unions: Type[]): PlainAstTypes {
    const declaredTypes: PlainAstTypes = { unions: [], interfaces: [] };

    // add interfaces
    for (const type of interfaces) {
        const properties: PlainProperty[] = [];
        for (const attribute of type.attributes) {
            const property: PlainProperty = {
                name: attribute.name,
                optional: attribute.isOptional,
                astNodes: new Set([attribute]),
                type: typeDefinitionToPropertyType(attribute.type)
            };
            if (attribute.defaultValue) {
                property.defaultValue = toPropertyDefaultValue(attribute.defaultValue);
            }
            properties.push(property);
        }
        const superTypes = new Set<string>();
        for (const superType of type.superTypes) {
            if (superType.ref) {
                superTypes.add(getTypeName(superType.ref));
            }
        }
        const interfaceType: PlainInterface = {
            name: type.name,
            declared: true,
            abstract: false,
            properties: properties,
            superTypes: superTypes,
            subTypes: new Set()
        };
        declaredTypes.interfaces.push(interfaceType);
    }

    // add types
    for (const union of unions) {
        const unionType: PlainUnion = {
            name: union.name,
            declared: true,
            type: typeDefinitionToPropertyType(union.type),
            superTypes: new Set(),
            subTypes: new Set()
        };
        declaredTypes.unions.push(unionType);
    }

    return declaredTypes;
}

function toPropertyDefaultValue(literal: ValueLiteral): PlainPropertyDefaultValue {
    if (isBooleanLiteral(literal)) {
        return literal.true;
    } else if (isArrayLiteral(literal)) {
        return literal.elements.map(toPropertyDefaultValue);
    } else {
        return literal.value;
    }
}

export function typeDefinitionToPropertyType(type: TypeDefinition): PlainPropertyType {
    if (isArrayType(type)) {
        return {
            elementType: typeDefinitionToPropertyType(type.elementType)
        };
    } else if (isReferenceType(type)) {
        return {
            referenceType: typeDefinitionToPropertyType(type.referenceType)
        };
    } else if (isUnionType(type)) {
        return {
            types: type.types.map(typeDefinitionToPropertyType)
        };
    } else if (isSimpleType(type)) {
        let value: string | undefined;
        if (type.primitiveType) {
            value = type.primitiveType;
            return {
                primitive: value
            };
        } else if (type.stringType) {
            value = type.stringType;
            return {
                string: value
            };
        } else if (type.typeRef) {
            const ref = type.typeRef.ref;
            const value = getTypeNameWithoutError(ref);
            if (value) {
                if (isPrimitiveGrammarType(value)) {
                    return {
                        primitive: value
                    };
                } else {
                    return {
                        value
                    };
                }
            }
        }
    }
    return {
        primitive: 'unknown'
    };
}
