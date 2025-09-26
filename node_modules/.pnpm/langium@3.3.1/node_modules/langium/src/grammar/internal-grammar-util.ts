/******************************************************************************
 * Copyright 2021-2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { URI } from '../utils/uri-utils.js';
import type { LangiumDocuments } from '../workspace/documents.js';
import type { AstNode } from '../syntax-tree.js';
import * as ast from '../languages/generated/ast.js';
import { getDocument } from '../utils/ast-utils.js';
import { UriUtils } from '../utils/uri-utils.js';
import type { LangiumGrammarServices} from './langium-grammar-module.js';
import { createLangiumGrammarServices } from './langium-grammar-module.js';
import type { IParserConfig } from '../parser/parser-config.js';
import type { LanguageMetaData } from '../languages/language-meta-data.js';
import type { Module} from '../dependency-injection.js';
import { inject } from '../dependency-injection.js';
import type { LangiumGeneratedCoreServices, LangiumGeneratedSharedCoreServices } from '../services.js';
import type { LangiumServices, LangiumSharedServices } from '../lsp/lsp-services.js';
import { createDefaultModule, createDefaultSharedModule } from '../lsp/default-lsp-module.js';
import { EmptyFileSystem } from '../workspace/file-system-provider.js';
import { interpretAstReflection } from './ast-reflection-interpreter.js';
import { getTypeName, isDataType } from '../utils/grammar-utils.js';

export function hasDataTypeReturn(rule: ast.ParserRule): boolean {
    const returnType = rule.returnType?.ref;
    return rule.dataType !== undefined || (ast.isType(returnType) && isDataType(returnType));
}

export function isStringGrammarType(type: ast.AbstractType | ast.TypeDefinition): boolean {
    return isStringTypeInternal(type, new Set());
}

function isStringTypeInternal(type: ast.AbstractType | ast.TypeDefinition, visited: Set<AstNode>): boolean {
    if (visited.has(type)) {
        return true;
    } else {
        visited.add(type);
    }
    if (ast.isParserRule(type)) {
        if (type.dataType) {
            return type.dataType === 'string';
        }
        if (type.returnType?.ref) {
            return isStringTypeInternal(type.returnType.ref, visited);
        }
    } else if (ast.isType(type)) {
        return isStringTypeInternal(type.type, visited);
    } else if (ast.isArrayType(type)) {
        return false;
    } else if (ast.isReferenceType(type)) {
        return false;
    } else if (ast.isUnionType(type)) {
        return type.types.every(e => isStringTypeInternal(e, visited));
    } else if (ast.isSimpleType(type)) {
        if (type.primitiveType === 'string') {
            return true;
        } else if (type.stringType) {
            return true;
        } else if (type.typeRef?.ref) {
            return isStringTypeInternal(type.typeRef.ref, visited);
        }
    }
    return false;
}

export function getTypeNameWithoutError(type?: ast.AbstractType | ast.Action): string | undefined {
    if (!type) {
        return undefined;
    }
    try {
        return getTypeName(type);
    } catch {
        return undefined;
    }
}

export function resolveImportUri(imp: ast.GrammarImport): URI | undefined {
    if (imp.path === undefined || imp.path.length === 0) {
        return undefined;
    }
    const dirUri = UriUtils.dirname(getDocument(imp).uri);
    let grammarPath = imp.path;
    if (!grammarPath.endsWith('.langium')) {
        grammarPath += '.langium';
    }
    return UriUtils.resolvePath(dirUri, grammarPath);
}

export function resolveImport(documents: LangiumDocuments, imp: ast.GrammarImport): ast.Grammar | undefined {
    const resolvedUri = resolveImportUri(imp);
    if (!resolvedUri) {
        return undefined;
    }
    const resolvedDocument = documents.getDocument(resolvedUri);
    if (!resolvedDocument) {
        return undefined;
    }
    const node = resolvedDocument.parseResult.value;
    if (ast.isGrammar(node)) {
        return node;
    }
    return undefined;
}

export function resolveTransitiveImports(documents: LangiumDocuments, grammar: ast.Grammar): ast.Grammar[]
export function resolveTransitiveImports(documents: LangiumDocuments, importNode: ast.GrammarImport): ast.Grammar[]
export function resolveTransitiveImports(documents: LangiumDocuments, grammarOrImport: ast.Grammar | ast.GrammarImport): ast.Grammar[] {
    if (ast.isGrammarImport(grammarOrImport)) {
        const resolvedGrammar = resolveImport(documents, grammarOrImport);
        if (resolvedGrammar) {
            const transitiveGrammars = resolveTransitiveImportsInternal(documents, resolvedGrammar);
            transitiveGrammars.push(resolvedGrammar);
            return transitiveGrammars;
        }
        return [];
    } else {
        return resolveTransitiveImportsInternal(documents, grammarOrImport);
    }
}

function resolveTransitiveImportsInternal(documents: LangiumDocuments, grammar: ast.Grammar, initialGrammar = grammar, visited: Set<URI> = new Set(), grammars: Set<ast.Grammar> = new Set()): ast.Grammar[] {
    const doc = getDocument(grammar);
    if (initialGrammar !== grammar) {
        grammars.add(grammar);
    }
    if (!visited.has(doc.uri)) {
        visited.add(doc.uri);
        for (const imp of grammar.imports) {
            const importedGrammar = resolveImport(documents, imp);
            if (importedGrammar) {
                resolveTransitiveImportsInternal(documents, importedGrammar, initialGrammar, visited, grammars);
            }
        }
    }
    return Array.from(grammars);
}

export function extractAssignments(element: ast.AbstractElement): ast.Assignment[] {
    if (ast.isAssignment(element)) {
        return [element];
    } else if (ast.isAlternatives(element) || ast.isGroup(element) || ast.isUnorderedGroup(element)) {
        return element.elements.flatMap(e => extractAssignments(e));
    } else if (ast.isRuleCall(element) && element.rule.ref) {
        return extractAssignments(element.rule.ref.definition);
    }
    return [];
}

const primitiveTypes = ['string', 'number', 'boolean', 'Date', 'bigint'];

export function isPrimitiveGrammarType(type: string): boolean {
    return primitiveTypes.includes(type);
}

/**
 * Create an instance of the language services for the given grammar. This function is very
 * useful when the grammar is defined on-the-fly, for example in tests of the Langium framework.
 */
export async function createServicesForGrammar<L extends LangiumServices = LangiumServices, S extends LangiumSharedServices = LangiumSharedServices>(config: {
    grammar: string | ast.Grammar,
    grammarServices?: LangiumGrammarServices,
    parserConfig?: IParserConfig,
    languageMetaData?: LanguageMetaData,
    module?: Module<L, unknown>
    sharedModule?: Module<S, unknown>
}): Promise<L> {
    const grammarServices = config.grammarServices ?? createLangiumGrammarServices(EmptyFileSystem).grammar;
    const uri = URI.parse('memory:///grammar.langium');
    const factory = grammarServices.shared.workspace.LangiumDocumentFactory;
    const grammarDocument = typeof config.grammar === 'string'
        ? factory.fromString(config.grammar, uri)
        : getDocument(config.grammar);
    const grammarNode = grammarDocument.parseResult.value as ast.Grammar;
    const documentBuilder = grammarServices.shared.workspace.DocumentBuilder;
    await documentBuilder.build([grammarDocument], { validation: false });

    const parserConfig = config.parserConfig ?? {
        skipValidations: false
    };
    const languageMetaData = config.languageMetaData ?? {
        caseInsensitive: false,
        fileExtensions: [`.${grammarNode.name?.toLowerCase() ?? 'unknown'}`],
        languageId: grammarNode.name ?? 'UNKNOWN',
        mode: 'development'
    };
    const generatedSharedModule: Module<LangiumGeneratedSharedCoreServices> = {
        AstReflection: () => interpretAstReflection(grammarNode),
    };
    const generatedModule: Module<LangiumGeneratedCoreServices> = {
        Grammar: () => grammarNode,
        LanguageMetaData: () => languageMetaData,
        parser: {
            ParserConfig: () => parserConfig
        }
    };
    const shared = inject(createDefaultSharedModule(EmptyFileSystem), generatedSharedModule, config.sharedModule);
    const services = inject(createDefaultModule({ shared }), generatedModule, config.module);
    shared.ServiceRegistry.register(services);
    return services;
}
