/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { EMPTY_SCOPE, MapScope } from '../../references/scope.js';
import { DefaultScopeComputation } from '../../references/scope-computation.js';
import { DefaultScopeProvider } from '../../references/scope-provider.js';
import { findRootNode, getContainerOfType, getDocument, streamAllContents } from '../../utils/ast-utils.js';
import { toDocumentSegment } from '../../utils/cst-utils.js';
import { stream } from '../../utils/stream.js';
import { AbstractType, InferredType, Interface, isAction, isGrammar, isParserRule, isReturnType, Type } from '../../languages/generated/ast.js';
import { resolveImportUri } from '../internal-grammar-util.js';
export class LangiumGrammarScopeProvider extends DefaultScopeProvider {
    constructor(services) {
        super(services);
        this.langiumDocuments = services.shared.workspace.LangiumDocuments;
    }
    getScope(context) {
        const referenceType = this.reflection.getReferenceType(context);
        if (referenceType === AbstractType) {
            return this.getTypeScope(referenceType, context);
        }
        else {
            return super.getScope(context);
        }
    }
    getTypeScope(referenceType, context) {
        let localScope;
        const precomputed = getDocument(context.container).precomputedScopes;
        const rootNode = findRootNode(context.container);
        if (precomputed && rootNode) {
            const allDescriptions = precomputed.get(rootNode);
            if (allDescriptions.length > 0) {
                localScope = stream(allDescriptions).filter(des => des.type === Interface || des.type === Type || des.type === InferredType);
            }
        }
        const globalScope = this.getGlobalScope(referenceType, context);
        if (localScope) {
            return this.createScope(localScope, globalScope);
        }
        else {
            return globalScope;
        }
    }
    getGlobalScope(referenceType, context) {
        const grammar = getContainerOfType(context.container, isGrammar);
        if (!grammar) {
            return EMPTY_SCOPE;
        }
        const importedUris = new Set();
        this.gatherImports(grammar, importedUris);
        let importedElements = this.indexManager.allElements(referenceType, importedUris);
        if (referenceType === AbstractType) {
            importedElements = importedElements.filter(des => des.type === Interface || des.type === Type || des.type === InferredType);
        }
        return new MapScope(importedElements);
    }
    gatherImports(grammar, importedUris) {
        for (const imp0rt of grammar.imports) {
            const uri = resolveImportUri(imp0rt);
            if (uri && !importedUris.has(uri.toString())) {
                importedUris.add(uri.toString());
                const importedDocument = this.langiumDocuments.getDocument(uri);
                if (importedDocument) {
                    const rootNode = importedDocument.parseResult.value;
                    if (isGrammar(rootNode)) {
                        this.gatherImports(rootNode, importedUris);
                    }
                }
            }
        }
    }
}
export class LangiumGrammarScopeComputation extends DefaultScopeComputation {
    constructor(services) {
        super(services);
        this.astNodeLocator = services.workspace.AstNodeLocator;
    }
    exportNode(node, exports, document) {
        // this function is called in order to export nodes to the GLOBAL scope
        var _a;
        /* Among others, TYPES need to be exported.
         * There are three ways to define types:
         * - explicit "type" declarations
         * - explicit "interface" declarations
         * - "inferred types", which can be distinguished into ...
         *     - inferred types with explicitly declared names, i.e. parser rules with "infers", actions with "infer"
         *       Note, that multiple explicitly inferred types might have the same name! Cross-references to such types are resolved to the first declaration.
         *     - implicitly inferred types, i.e. parser rules without "infers" and without "returns",
         *       which implicitly declare a type with the same name as the parser rule
         *       Note, that implicitly inferred types are unique, since names of parser rules must be unique.
         */
        // export the top-level elements: parser rules, terminal rules, types, interfaces
        super.exportNode(node, exports, document);
        // additionally, export inferred types:
        if (isParserRule(node)) {
            if (!node.returnType && !node.dataType) {
                // Export implicitly and explicitly inferred type from parser rule
                const typeNode = (_a = node.inferredType) !== null && _a !== void 0 ? _a : node;
                exports.push(this.createInferredTypeDescription(typeNode, typeNode.name, document));
            }
            streamAllContents(node).forEach(childNode => {
                if (isAction(childNode) && childNode.inferredType) {
                    // Export explicitly inferred type from action
                    exports.push(this.createInferredTypeDescription(childNode.inferredType, childNode.inferredType.name, document));
                }
            });
        }
    }
    processNode(node, document, scopes) {
        // for the precompution of the local scope
        if (isReturnType(node)) {
            return;
        }
        this.processTypeNode(node, document, scopes);
        this.processActionNode(node, document, scopes);
        super.processNode(node, document, scopes);
    }
    /**
     * Add synthetic type into the scope in case of explicitly or implicitly inferred type:<br>
     * cases: `ParserRule: ...;` or `ParserRule infers Type: ...;`
     */
    processTypeNode(node, document, scopes) {
        var _a;
        const container = node.$container;
        if (container && isParserRule(node) && !node.returnType && !node.dataType) {
            const typeNode = (_a = node.inferredType) !== null && _a !== void 0 ? _a : node;
            scopes.add(container, this.createInferredTypeDescription(typeNode, typeNode.name, document));
        }
    }
    /**
     * Add synthetic type into the scope in case of explicitly inferred type:
     *
     * case: `{infer Action}`
     */
    processActionNode(node, document, scopes) {
        const container = findRootNode(node);
        if (container && isAction(node) && node.inferredType) {
            scopes.add(container, this.createInferredTypeDescription(node.inferredType, node.inferredType.name, document));
        }
    }
    createInferredTypeDescription(node, name, document = getDocument(node)) {
        let nameNodeSegment;
        const nameSegmentGetter = () => { var _a; return nameNodeSegment !== null && nameNodeSegment !== void 0 ? nameNodeSegment : (nameNodeSegment = toDocumentSegment((_a = this.nameProvider.getNameNode(node)) !== null && _a !== void 0 ? _a : node.$cstNode)); };
        return {
            node,
            name,
            get nameSegment() {
                return nameSegmentGetter();
            },
            selectionSegment: toDocumentSegment(node.$cstNode),
            type: InferredType,
            documentUri: document.uri,
            path: this.astNodeLocator.getAstNodePath(node)
        };
    }
}
//# sourceMappingURL=grammar-scope.js.map