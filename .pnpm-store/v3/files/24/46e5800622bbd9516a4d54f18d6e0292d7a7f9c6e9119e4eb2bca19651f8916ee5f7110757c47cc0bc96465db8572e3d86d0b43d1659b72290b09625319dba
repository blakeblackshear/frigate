/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { AbstractAstReflection } from '../syntax-tree.js';
import { MultiMap } from '../utils/collections.js';
import { isGrammar } from '../languages/generated/ast.js';
import { collectAst } from './type-system/ast-collector.js';
import { collectTypeHierarchy, findReferenceTypes, isAstType, mergeTypesAndInterfaces } from './type-system/types-util.js';
export function interpretAstReflection(grammarOrTypes, documents) {
    let collectedTypes;
    if (isGrammar(grammarOrTypes)) {
        collectedTypes = collectAst(grammarOrTypes, documents);
    }
    else {
        collectedTypes = grammarOrTypes;
    }
    const allTypes = collectedTypes.interfaces.map(e => e.name).concat(collectedTypes.unions.filter(e => isAstType(e.type)).map(e => e.name));
    const references = buildReferenceTypes(collectedTypes);
    const metaData = buildTypeMetaData(collectedTypes);
    const superTypes = collectTypeHierarchy(mergeTypesAndInterfaces(collectedTypes)).superTypes;
    return new InterpretedAstReflection({
        allTypes,
        references,
        metaData,
        superTypes
    });
}
class InterpretedAstReflection extends AbstractAstReflection {
    constructor(options) {
        super();
        this.allTypes = options.allTypes;
        this.references = options.references;
        this.metaData = options.metaData;
        this.superTypes = options.superTypes;
    }
    getAllTypes() {
        return this.allTypes;
    }
    getReferenceType(refInfo) {
        const referenceId = `${refInfo.container.$type}:${refInfo.property}`;
        const referenceType = this.references.get(referenceId);
        if (referenceType) {
            return referenceType;
        }
        throw new Error('Could not find reference type for ' + referenceId);
    }
    getTypeMetaData(type) {
        var _a;
        return (_a = this.metaData.get(type)) !== null && _a !== void 0 ? _a : {
            name: type,
            properties: []
        };
    }
    computeIsSubtype(subtype, originalSuperType) {
        const superTypes = this.superTypes.get(subtype);
        for (const superType of superTypes) {
            if (this.isSubtype(superType, originalSuperType)) {
                return true;
            }
        }
        return false;
    }
}
function buildReferenceTypes(astTypes) {
    const references = new MultiMap();
    for (const interfaceType of astTypes.interfaces) {
        for (const property of interfaceType.properties) {
            for (const referenceType of findReferenceTypes(property.type)) {
                references.add(interfaceType.name, [property.name, referenceType]);
            }
        }
        for (const superType of interfaceType.interfaceSuperTypes) {
            const superTypeReferences = references.get(superType.name);
            references.addAll(interfaceType.name, superTypeReferences);
        }
    }
    const map = new Map();
    for (const [type, [property, target]] of references) {
        map.set(`${type}:${property}`, target);
    }
    return map;
}
function buildTypeMetaData(astTypes) {
    const map = new Map();
    for (const interfaceType of astTypes.interfaces) {
        const props = interfaceType.superProperties;
        map.set(interfaceType.name, {
            name: interfaceType.name,
            properties: buildPropertyMetaData(props)
        });
    }
    return map;
}
function buildPropertyMetaData(props) {
    const array = [];
    const all = props.sort((a, b) => a.name.localeCompare(b.name));
    for (const property of all) {
        const mandatoryProperty = {
            name: property.name,
            defaultValue: property.defaultValue
        };
        array.push(mandatoryProperty);
    }
    return array;
}
//# sourceMappingURL=ast-reflection-interpreter.js.map