/******************************************************************************
 * Copyright 2021-2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { URI } from '../utils/uri-utils.js';
import type { LangiumDocuments } from '../workspace/documents.js';
import * as ast from '../languages/generated/ast.js';
import type { LangiumGrammarServices } from './langium-grammar-module.js';
import type { IParserConfig } from '../parser/parser-config.js';
import type { LanguageMetaData } from '../languages/language-meta-data.js';
import type { Module } from '../dependency-injection.js';
import type { LangiumServices, LangiumSharedServices } from '../lsp/lsp-services.js';
export declare function hasDataTypeReturn(rule: ast.ParserRule): boolean;
export declare function isStringGrammarType(type: ast.AbstractType | ast.TypeDefinition): boolean;
export declare function getTypeNameWithoutError(type?: ast.AbstractType | ast.Action): string | undefined;
export declare function resolveImportUri(imp: ast.GrammarImport): URI | undefined;
export declare function resolveImport(documents: LangiumDocuments, imp: ast.GrammarImport): ast.Grammar | undefined;
export declare function resolveTransitiveImports(documents: LangiumDocuments, grammar: ast.Grammar): ast.Grammar[];
export declare function resolveTransitiveImports(documents: LangiumDocuments, importNode: ast.GrammarImport): ast.Grammar[];
export declare function extractAssignments(element: ast.AbstractElement): ast.Assignment[];
export declare function isPrimitiveGrammarType(type: string): boolean;
/**
 * Create an instance of the language services for the given grammar. This function is very
 * useful when the grammar is defined on-the-fly, for example in tests of the Langium framework.
 */
export declare function createServicesForGrammar<L extends LangiumServices = LangiumServices, S extends LangiumSharedServices = LangiumSharedServices>(config: {
    grammar: string | ast.Grammar;
    grammarServices?: LangiumGrammarServices;
    parserConfig?: IParserConfig;
    languageMetaData?: LanguageMetaData;
    module?: Module<L, unknown>;
    sharedModule?: Module<S, unknown>;
}): Promise<L>;
//# sourceMappingURL=internal-grammar-util.d.ts.map