/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CompositeCstNodeImpl, LeafCstNodeImpl, RootCstNodeImpl } from '../parser/cst-node-builder.js';
import { isAbstractElement } from '../languages/generated/ast.js';
import { isRootCstNode, isCompositeCstNode, isLeafCstNode, isAstNode, isReference } from '../syntax-tree.js';
import { streamAst } from '../utils/ast-utils.js';
import { BiMap } from '../utils/collections.js';
import { streamCst } from '../utils/cst-utils.js';
export class DefaultHydrator {
    constructor(services) {
        this.grammarElementIdMap = new BiMap();
        this.tokenTypeIdMap = new BiMap();
        this.grammar = services.Grammar;
        this.lexer = services.parser.Lexer;
        this.linker = services.references.Linker;
    }
    dehydrate(result) {
        return {
            lexerErrors: result.lexerErrors,
            lexerReport: result.lexerReport ? this.dehydrateLexerReport(result.lexerReport) : undefined,
            // We need to create shallow copies of the errors
            // The original errors inherit from the `Error` class, which is not transferable across worker threads
            parserErrors: result.parserErrors.map(e => (Object.assign(Object.assign({}, e), { message: e.message }))),
            value: this.dehydrateAstNode(result.value, this.createDehyrationContext(result.value))
        };
    }
    dehydrateLexerReport(lexerReport) {
        // By default, lexer reports are serializable
        return lexerReport;
    }
    createDehyrationContext(node) {
        const astNodes = new Map();
        const cstNodes = new Map();
        for (const astNode of streamAst(node)) {
            astNodes.set(astNode, {});
        }
        if (node.$cstNode) {
            for (const cstNode of streamCst(node.$cstNode)) {
                cstNodes.set(cstNode, {});
            }
        }
        return {
            astNodes,
            cstNodes
        };
    }
    dehydrateAstNode(node, context) {
        const obj = context.astNodes.get(node);
        obj.$type = node.$type;
        obj.$containerIndex = node.$containerIndex;
        obj.$containerProperty = node.$containerProperty;
        if (node.$cstNode !== undefined) {
            obj.$cstNode = this.dehydrateCstNode(node.$cstNode, context);
        }
        for (const [name, value] of Object.entries(node)) {
            if (name.startsWith('$')) {
                continue;
            }
            if (Array.isArray(value)) {
                const arr = [];
                obj[name] = arr;
                for (const item of value) {
                    if (isAstNode(item)) {
                        arr.push(this.dehydrateAstNode(item, context));
                    }
                    else if (isReference(item)) {
                        arr.push(this.dehydrateReference(item, context));
                    }
                    else {
                        arr.push(item);
                    }
                }
            }
            else if (isAstNode(value)) {
                obj[name] = this.dehydrateAstNode(value, context);
            }
            else if (isReference(value)) {
                obj[name] = this.dehydrateReference(value, context);
            }
            else if (value !== undefined) {
                obj[name] = value;
            }
        }
        return obj;
    }
    dehydrateReference(reference, context) {
        const obj = {};
        obj.$refText = reference.$refText;
        if (reference.$refNode) {
            obj.$refNode = context.cstNodes.get(reference.$refNode);
        }
        return obj;
    }
    dehydrateCstNode(node, context) {
        const cstNode = context.cstNodes.get(node);
        if (isRootCstNode(node)) {
            cstNode.fullText = node.fullText;
        }
        else {
            // Note: This returns undefined for hidden nodes (i.e. comments)
            cstNode.grammarSource = this.getGrammarElementId(node.grammarSource);
        }
        cstNode.hidden = node.hidden;
        cstNode.astNode = context.astNodes.get(node.astNode);
        if (isCompositeCstNode(node)) {
            cstNode.content = node.content.map(child => this.dehydrateCstNode(child, context));
        }
        else if (isLeafCstNode(node)) {
            cstNode.tokenType = node.tokenType.name;
            cstNode.offset = node.offset;
            cstNode.length = node.length;
            cstNode.startLine = node.range.start.line;
            cstNode.startColumn = node.range.start.character;
            cstNode.endLine = node.range.end.line;
            cstNode.endColumn = node.range.end.character;
        }
        return cstNode;
    }
    hydrate(result) {
        const node = result.value;
        const context = this.createHydrationContext(node);
        if ('$cstNode' in node) {
            this.hydrateCstNode(node.$cstNode, context);
        }
        return {
            lexerErrors: result.lexerErrors,
            lexerReport: result.lexerReport,
            parserErrors: result.parserErrors,
            value: this.hydrateAstNode(node, context)
        };
    }
    createHydrationContext(node) {
        const astNodes = new Map();
        const cstNodes = new Map();
        for (const astNode of streamAst(node)) {
            astNodes.set(astNode, {});
        }
        let root;
        if (node.$cstNode) {
            for (const cstNode of streamCst(node.$cstNode)) {
                let cst;
                if ('fullText' in cstNode) {
                    cst = new RootCstNodeImpl(cstNode.fullText);
                    root = cst;
                }
                else if ('content' in cstNode) {
                    cst = new CompositeCstNodeImpl();
                }
                else if ('tokenType' in cstNode) {
                    cst = this.hydrateCstLeafNode(cstNode);
                }
                if (cst) {
                    cstNodes.set(cstNode, cst);
                    cst.root = root;
                }
            }
        }
        return {
            astNodes,
            cstNodes
        };
    }
    hydrateAstNode(node, context) {
        const astNode = context.astNodes.get(node);
        astNode.$type = node.$type;
        astNode.$containerIndex = node.$containerIndex;
        astNode.$containerProperty = node.$containerProperty;
        if (node.$cstNode) {
            astNode.$cstNode = context.cstNodes.get(node.$cstNode);
        }
        for (const [name, value] of Object.entries(node)) {
            if (name.startsWith('$')) {
                continue;
            }
            if (Array.isArray(value)) {
                const arr = [];
                astNode[name] = arr;
                for (const item of value) {
                    if (isAstNode(item)) {
                        arr.push(this.setParent(this.hydrateAstNode(item, context), astNode));
                    }
                    else if (isReference(item)) {
                        arr.push(this.hydrateReference(item, astNode, name, context));
                    }
                    else {
                        arr.push(item);
                    }
                }
            }
            else if (isAstNode(value)) {
                astNode[name] = this.setParent(this.hydrateAstNode(value, context), astNode);
            }
            else if (isReference(value)) {
                astNode[name] = this.hydrateReference(value, astNode, name, context);
            }
            else if (value !== undefined) {
                astNode[name] = value;
            }
        }
        return astNode;
    }
    setParent(node, parent) {
        node.$container = parent;
        return node;
    }
    hydrateReference(reference, node, name, context) {
        return this.linker.buildReference(node, name, context.cstNodes.get(reference.$refNode), reference.$refText);
    }
    hydrateCstNode(cstNode, context, num = 0) {
        const cstNodeObj = context.cstNodes.get(cstNode);
        if (typeof cstNode.grammarSource === 'number') {
            cstNodeObj.grammarSource = this.getGrammarElement(cstNode.grammarSource);
        }
        cstNodeObj.astNode = context.astNodes.get(cstNode.astNode);
        if (isCompositeCstNode(cstNodeObj)) {
            for (const child of cstNode.content) {
                const hydrated = this.hydrateCstNode(child, context, num++);
                cstNodeObj.content.push(hydrated);
            }
        }
        return cstNodeObj;
    }
    hydrateCstLeafNode(cstNode) {
        const tokenType = this.getTokenType(cstNode.tokenType);
        const offset = cstNode.offset;
        const length = cstNode.length;
        const startLine = cstNode.startLine;
        const startColumn = cstNode.startColumn;
        const endLine = cstNode.endLine;
        const endColumn = cstNode.endColumn;
        const hidden = cstNode.hidden;
        const node = new LeafCstNodeImpl(offset, length, {
            start: {
                line: startLine,
                character: startColumn
            },
            end: {
                line: endLine,
                character: endColumn
            }
        }, tokenType, hidden);
        return node;
    }
    getTokenType(name) {
        return this.lexer.definition[name];
    }
    getGrammarElementId(node) {
        if (!node) {
            return undefined;
        }
        if (this.grammarElementIdMap.size === 0) {
            this.createGrammarElementIdMap();
        }
        return this.grammarElementIdMap.get(node);
    }
    getGrammarElement(id) {
        if (this.grammarElementIdMap.size === 0) {
            this.createGrammarElementIdMap();
        }
        const element = this.grammarElementIdMap.getKey(id);
        return element;
    }
    createGrammarElementIdMap() {
        let id = 0;
        for (const element of streamAst(this.grammar)) {
            if (isAbstractElement(element)) {
                this.grammarElementIdMap.set(element, id++);
            }
        }
    }
}
//# sourceMappingURL=hydrator.js.map