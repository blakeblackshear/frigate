/******************************************************************************
 * Copyright 2021-2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { URI } from '../utils/uri-utils.js';
import * as ast from '../languages/generated/ast.js';
import { getDocument } from '../utils/ast-utils.js';
import { UriUtils } from '../utils/uri-utils.js';
import { createLangiumGrammarServices } from './langium-grammar-module.js';
import { inject } from '../dependency-injection.js';
import { createDefaultModule, createDefaultSharedModule } from '../lsp/default-lsp-module.js';
import { EmptyFileSystem } from '../workspace/file-system-provider.js';
import { interpretAstReflection } from './ast-reflection-interpreter.js';
import { getTypeName, isDataType } from '../utils/grammar-utils.js';
export function hasDataTypeReturn(rule) {
    var _a;
    const returnType = (_a = rule.returnType) === null || _a === void 0 ? void 0 : _a.ref;
    return rule.dataType !== undefined || (ast.isType(returnType) && isDataType(returnType));
}
export function isStringGrammarType(type) {
    return isStringTypeInternal(type, new Set());
}
function isStringTypeInternal(type, visited) {
    var _a, _b;
    if (visited.has(type)) {
        return true;
    }
    else {
        visited.add(type);
    }
    if (ast.isParserRule(type)) {
        if (type.dataType) {
            return type.dataType === 'string';
        }
        if ((_a = type.returnType) === null || _a === void 0 ? void 0 : _a.ref) {
            return isStringTypeInternal(type.returnType.ref, visited);
        }
    }
    else if (ast.isType(type)) {
        return isStringTypeInternal(type.type, visited);
    }
    else if (ast.isArrayType(type)) {
        return false;
    }
    else if (ast.isReferenceType(type)) {
        return false;
    }
    else if (ast.isUnionType(type)) {
        return type.types.every(e => isStringTypeInternal(e, visited));
    }
    else if (ast.isSimpleType(type)) {
        if (type.primitiveType === 'string') {
            return true;
        }
        else if (type.stringType) {
            return true;
        }
        else if ((_b = type.typeRef) === null || _b === void 0 ? void 0 : _b.ref) {
            return isStringTypeInternal(type.typeRef.ref, visited);
        }
    }
    return false;
}
export function getTypeNameWithoutError(type) {
    if (!type) {
        return undefined;
    }
    try {
        return getTypeName(type);
    }
    catch (_a) {
        return undefined;
    }
}
export function resolveImportUri(imp) {
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
export function resolveImport(documents, imp) {
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
export function resolveTransitiveImports(documents, grammarOrImport) {
    if (ast.isGrammarImport(grammarOrImport)) {
        const resolvedGrammar = resolveImport(documents, grammarOrImport);
        if (resolvedGrammar) {
            const transitiveGrammars = resolveTransitiveImportsInternal(documents, resolvedGrammar);
            transitiveGrammars.push(resolvedGrammar);
            return transitiveGrammars;
        }
        return [];
    }
    else {
        return resolveTransitiveImportsInternal(documents, grammarOrImport);
    }
}
function resolveTransitiveImportsInternal(documents, grammar, initialGrammar = grammar, visited = new Set(), grammars = new Set()) {
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
export function extractAssignments(element) {
    if (ast.isAssignment(element)) {
        return [element];
    }
    else if (ast.isAlternatives(element) || ast.isGroup(element) || ast.isUnorderedGroup(element)) {
        return element.elements.flatMap(e => extractAssignments(e));
    }
    else if (ast.isRuleCall(element) && element.rule.ref) {
        return extractAssignments(element.rule.ref.definition);
    }
    return [];
}
const primitiveTypes = ['string', 'number', 'boolean', 'Date', 'bigint'];
export function isPrimitiveGrammarType(type) {
    return primitiveTypes.includes(type);
}
/**
 * Create an instance of the language services for the given grammar. This function is very
 * useful when the grammar is defined on-the-fly, for example in tests of the Langium framework.
 */
export async function createServicesForGrammar(config) {
    var _a, _b, _c, _d, _e, _f;
    const grammarServices = (_a = config.grammarServices) !== null && _a !== void 0 ? _a : createLangiumGrammarServices(EmptyFileSystem).grammar;
    const uri = URI.parse('memory:///grammar.langium');
    const factory = grammarServices.shared.workspace.LangiumDocumentFactory;
    const grammarDocument = typeof config.grammar === 'string'
        ? factory.fromString(config.grammar, uri)
        : getDocument(config.grammar);
    const grammarNode = grammarDocument.parseResult.value;
    const documentBuilder = grammarServices.shared.workspace.DocumentBuilder;
    await documentBuilder.build([grammarDocument], { validation: false });
    const parserConfig = (_b = config.parserConfig) !== null && _b !== void 0 ? _b : {
        skipValidations: false
    };
    const languageMetaData = (_c = config.languageMetaData) !== null && _c !== void 0 ? _c : {
        caseInsensitive: false,
        fileExtensions: [`.${(_e = (_d = grammarNode.name) === null || _d === void 0 ? void 0 : _d.toLowerCase()) !== null && _e !== void 0 ? _e : 'unknown'}`],
        languageId: (_f = grammarNode.name) !== null && _f !== void 0 ? _f : 'UNKNOWN',
        mode: 'development'
    };
    const generatedSharedModule = {
        AstReflection: () => interpretAstReflection(grammarNode),
    };
    const generatedModule = {
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
//# sourceMappingURL=internal-grammar-util.js.map