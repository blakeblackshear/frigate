/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { collectInferredTypes } from './inferred-types.js';
import { collectDeclaredTypes } from './declared-types.js';
import { getDocument } from '../../../utils/ast-utils.js';
import { isParserRule } from '../../../languages/generated/ast.js';
import { resolveImport } from '../../internal-grammar-util.js';
import { isDataTypeRule } from '../../../utils/grammar-utils.js';
export function collectTypeResources(grammars, documents) {
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
export function collectAllAstResources(grammars, documents, visited = new Set(), astResources = { parserRules: [], datatypeRules: [], interfaces: [], types: [] }) {
    if (!Array.isArray(grammars))
        grammars = [grammars];
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
                }
                else {
                    astResources.parserRules.push(rule);
                }
            }
        }
        grammar.interfaces.forEach(e => astResources.interfaces.push(e));
        grammar.types.forEach(e => astResources.types.push(e));
        if (documents) {
            const importedGrammars = grammar.imports.map(e => resolveImport(documents, e)).filter((e) => e !== undefined);
            collectAllAstResources(importedGrammars, documents, visited, astResources);
        }
    }
    return astResources;
}
//# sourceMappingURL=all-types.js.map