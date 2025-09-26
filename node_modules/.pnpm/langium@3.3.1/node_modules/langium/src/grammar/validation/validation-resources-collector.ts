/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { LangiumDocuments } from '../../workspace/documents.js';
import type { AbstractElement, Action, Grammar, Interface, ParserRule, Type } from '../../languages/generated/ast.js';
import type { AstResources, ValidationAstTypes } from '../type-system/type-collector/all-types.js';
import type { TypeToValidationInfo, ValidationResources } from '../workspace/documents.js';
import type { LangiumGrammarServices } from '../langium-grammar-module.js';
import type { InterfaceType, Property } from '../type-system/type-collector/types.js';
import { MultiMap } from '../../utils/collections.js';
import { stream } from '../../utils/stream.js';
import { isAction, isAlternatives, isGroup, isUnorderedGroup } from '../../languages/generated/ast.js';
import { mergeInterfaces, mergeTypesAndInterfaces } from '../type-system/types-util.js';
import { collectValidationAst } from '../type-system/ast-collector.js';
import { getActionType, getRuleTypeName } from '../../utils/grammar-utils.js';

export class LangiumGrammarValidationResourcesCollector {
    private readonly documents: LangiumDocuments;

    constructor(services: LangiumGrammarServices) {
        this.documents = services.shared.workspace.LangiumDocuments;
    }

    collectValidationResources(grammar: Grammar): ValidationResources {
        try {
            const typeResources = collectValidationAst(grammar, this.documents);
            return {
                typeToValidationInfo: this.collectValidationInfo(typeResources),
                typeToSuperProperties: this.collectSuperProperties(typeResources),
            };
        } catch (err) {
            console.error('Error collecting validation resources', err);
            return { typeToValidationInfo: new Map(), typeToSuperProperties: new Map() };
        }
    }

    private collectValidationInfo({ astResources, inferred, declared }: ValidationAstTypes) {
        const res: TypeToValidationInfo = new Map();
        const typeNameToRulesActions = collectNameToRulesActions(astResources);

        for (const type of mergeTypesAndInterfaces(inferred)) {
            res.set(
                type.name,
                { inferred: type, inferredNodes: typeNameToRulesActions.get(type.name) }
            );
        }

        const typeNametoInterfacesUnions = stream(astResources.interfaces)
            .concat(astResources.types)
            .reduce((acc, type) => acc.set(type.name, type),
                new Map<string, Type | Interface>()
            );
        for (const type of mergeTypesAndInterfaces(declared)) {
            const node = typeNametoInterfacesUnions.get(type.name);
            if (node) {
                const inferred = res.get(type.name);
                res.set(
                    type.name,
                    { ...inferred ?? {}, declared: type, declaredNode: node }
                );
            }
        }

        return res;
    }

    private collectSuperProperties({ inferred, declared }: ValidationAstTypes): Map<string, Property[]> {
        const typeToSuperProperties: Map<string, Property[]> = new Map();
        const interfaces = mergeInterfaces(inferred, declared);
        const interfaceMap = new Map(interfaces.map(e => [e.name, e]));
        for (const type of mergeInterfaces(inferred, declared)) {
            typeToSuperProperties.set(type.name, this.addSuperProperties(type, interfaceMap, new Set()));
        }
        return typeToSuperProperties;
    }

    private addSuperProperties(interfaceType: InterfaceType, map: Map<string, InterfaceType>, visited: Set<string>): Property[] {
        if (visited.has(interfaceType.name)) {
            return [];
        }
        visited.add(interfaceType.name);
        const properties: Property[] = [...interfaceType.properties];
        for (const superType of interfaceType.superTypes) {
            const value = map.get(superType.name);
            if (value) {
                properties.push(...this.addSuperProperties(value, map, visited));
            }
        }
        return properties;
    }
}

function collectNameToRulesActions({ parserRules, datatypeRules }: AstResources): MultiMap<string, ParserRule | Action> {
    const acc = new MultiMap<string, ParserRule | Action>();

    // collect rules
    stream(parserRules)
        .concat(datatypeRules)
        .forEach(rule => acc.add(getRuleTypeName(rule), rule));

    // collect actions
    function collectActions(element: AbstractElement) {
        if (isAction(element)) {
            const name = getActionType(element);
            if (name) {
                acc.add(name, element);
            }
        } if (isAlternatives(element) || isGroup(element) || isUnorderedGroup(element)) {
            element.elements.forEach(e => collectActions(e));
        }
    }

    parserRules
        .forEach(rule => collectActions(rule.definition));

    return acc;
}
