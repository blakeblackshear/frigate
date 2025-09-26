/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { AstReflection, ReferenceInfo, TypeProperty, TypeMetaData } from '../syntax-tree.js';
import type { LangiumDocuments } from '../workspace/documents.js';
import type { Grammar } from '../languages/generated/ast.js';
import type { AstTypes, Property } from './type-system/type-collector/types.js';
import { AbstractAstReflection } from '../syntax-tree.js';
import { MultiMap } from '../utils/collections.js';
import { isGrammar } from '../languages/generated/ast.js';
import { collectAst } from './type-system/ast-collector.js';
import { collectTypeHierarchy, findReferenceTypes, isAstType, mergeTypesAndInterfaces } from './type-system/types-util.js';

export function interpretAstReflection(astTypes: AstTypes): AstReflection;
export function interpretAstReflection(grammar: Grammar, documents?: LangiumDocuments): AstReflection;
export function interpretAstReflection(grammarOrTypes: Grammar | AstTypes, documents?: LangiumDocuments): AstReflection {
    let collectedTypes: AstTypes;
    if (isGrammar(grammarOrTypes)) {
        collectedTypes = collectAst(grammarOrTypes, documents);
    } else {
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

    private readonly allTypes: string[];
    private readonly references: Map<string, string>;
    private readonly metaData: Map<string, TypeMetaData>;
    private readonly superTypes: MultiMap<string, string>;

    constructor(options: {
        allTypes: string[]
        references: Map<string, string>
        metaData: Map<string, TypeMetaData>
        superTypes: MultiMap<string, string>
    }) {
        super();
        this.allTypes = options.allTypes;
        this.references = options.references;
        this.metaData = options.metaData;
        this.superTypes = options.superTypes;
    }

    getAllTypes(): string[] {
        return this.allTypes;
    }

    getReferenceType(refInfo: ReferenceInfo): string {
        const referenceId = `${refInfo.container.$type}:${refInfo.property}`;
        const referenceType = this.references.get(referenceId);
        if (referenceType) {
            return referenceType;
        }
        throw new Error('Could not find reference type for ' + referenceId);
    }

    getTypeMetaData(type: string): TypeMetaData {
        return this.metaData.get(type) ?? {
            name: type,
            properties: []
        };
    }

    protected computeIsSubtype(subtype: string, originalSuperType: string): boolean {
        const superTypes = this.superTypes.get(subtype);
        for (const superType of superTypes) {
            if (this.isSubtype(superType, originalSuperType)) {
                return true;
            }
        }
        return false;
    }

}

function buildReferenceTypes(astTypes: AstTypes): Map<string, string> {
    const references = new MultiMap<string, [string, string]>();
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
    const map = new Map<string, string>();
    for (const [type, [property, target]] of references) {
        map.set(`${type}:${property}`, target);
    }
    return map;
}

function buildTypeMetaData(astTypes: AstTypes): Map<string, TypeMetaData> {
    const map = new Map<string, TypeMetaData>();
    for (const interfaceType of astTypes.interfaces) {
        const props = interfaceType.superProperties;
        map.set(interfaceType.name, {
            name: interfaceType.name,
            properties: buildPropertyMetaData(props)
        });
    }
    return map;
}

function buildPropertyMetaData(props: Property[]): TypeProperty[] {
    const array: TypeProperty[] = [];
    const all = props.sort((a, b) => a.name.localeCompare(b.name));
    for (const property of all) {
        const mandatoryProperty: TypeProperty = {
            name: property.name,
            defaultValue: property.defaultValue
        };
        array.push(mandatoryProperty);
    }
    return array;
}
