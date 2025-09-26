/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import type { ParserRule, Interface, Type, Grammar } from '../../../languages/generated/ast.js';
import type { URI } from '../../../utils/uri-utils.js';
import type { LangiumDocuments } from '../../../workspace/documents.js';
import type { PlainAstTypes } from './plain-types.js';
import type { AstTypes } from './types.js';
import { collectInferredTypes } from './inferred-types.js';
import { collectDeclaredTypes } from './declared-types.js';
import { getDocument } from '../../../utils/ast-utils.js';
import { isParserRule } from '../../../languages/generated/ast.js';
import { resolveImport } from '../../internal-grammar-util.js';
import { isDataTypeRule } from '../../../utils/grammar-utils.js';

export interface AstResources {
    parserRules: ParserRule[]
    datatypeRules: ParserRule[]
    interfaces: Interface[]
    types: Type[]
}

export interface TypeResources {
    inferred: PlainAstTypes
    declared: PlainAstTypes
    astResources: AstResources
}

export interface ValidationAstTypes {
    inferred: AstTypes
    declared: AstTypes
    astResources: AstResources
}

export function collectTypeResources(grammars: Grammar | Grammar[], documents?: LangiumDocuments): TypeResources {
    const astResources = collectAllAstResources(grammars, documents);
    const declared = collectDeclaredTypes(astResources.interfaces, astResources.types);
    const inferred = collectInferredTypes(astResources.parserRules, astResources.datatypeRules, declared);

    return {
        astResources,
        inferred,
        declared
    };
}

///////////////////////////////////////////////////////////////////////////////

export function collectAllAstResources(grammars: Grammar | Grammar[], documents?: LangiumDocuments, visited: Set<URI> = new Set(),
    astResources: AstResources = { parserRules: [], datatypeRules: [], interfaces: [], types: [] }): AstResources {

    if (!Array.isArray(grammars)) grammars = [grammars];
    for (const grammar of grammars) {
        const doc = getDocument(grammar);
        if (visited.has(doc.uri)) {
            continue;
        }
        visited.add(doc.uri);
        for (const rule of grammar.rules) {
            if (isParserRule(rule) && !rule.fragment) {
                if (isDataTypeRule(rule)) {
                    astResources.datatypeRules.push(rule);
                } else {
                    astResources.parserRules.push(rule);
                }
            }
        }
        grammar.interfaces.forEach(e => astResources.interfaces.push(e));
        grammar.types.forEach(e => astResources.types.push(e));

        if (documents) {
            const importedGrammars = grammar.imports.map(e => resolveImport(documents, e)).filter((e): e is Grammar => e !== undefined);
            collectAllAstResources(importedGrammars, documents, visited, astResources);
        }
    }
    return astResources;
}
