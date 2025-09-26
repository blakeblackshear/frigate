/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { FoldingRange, FoldingRangeKind } from 'vscode-languageserver';
import { streamAllContents } from '../utils/ast-utils.js';
import { flattenCst } from '../utils/cst-utils.js';
export class DefaultFoldingRangeProvider {
    constructor(services) {
        this.commentNames = services.parser.GrammarConfig.multilineCommentRules;
    }
    getFoldingRanges(document, _params, _cancelToken) {
        const foldings = [];
        const acceptor = (foldingRange) => foldings.push(foldingRange);
        this.collectFolding(document, acceptor);
        return foldings;
    }
    collectFolding(document, acceptor) {
        var _a;
        const root = (_a = document.parseResult) === null || _a === void 0 ? void 0 : _a.value;
        if (root) {
            if (this.shouldProcessContent(root)) {
                const treeIterator = streamAllContents(root).iterator();
                let result;
                do {
                    result = treeIterator.next();
                    if (!result.done) {
                        const node = result.value;
                        if (this.shouldProcess(node)) {
                            this.collectObjectFolding(document, node, acceptor);
                        }
                        if (!this.shouldProcessContent(node)) {
                            treeIterator.prune();
                        }
                    }
                } while (!result.done);
            }
            this.collectCommentFolding(document, root, acceptor);
        }
    }
    /**
     * Template method to determine whether the specified `AstNode` should be handled by the folding range provider.
     * Returns true by default for all nodes. Returning false only ignores the specified node and not its content.
     * To ignore the content of a node use `shouldProcessContent`.
     */
    shouldProcess(_node) {
        return true;
    }
    /**
     * Template method to determine whether the content/children of the specified `AstNode` should be handled by the folding range provider.
     * Returns true by default for all nodes. Returning false ignores _all_ content of this node, even transitive ones.
     * For more precise control over foldings use the `shouldProcess` method.
     */
    shouldProcessContent(_node) {
        return true;
    }
    collectObjectFolding(document, node, acceptor) {
        const cstNode = node.$cstNode;
        if (cstNode) {
            const foldingRange = this.toFoldingRange(document, cstNode);
            if (foldingRange) {
                acceptor(foldingRange);
            }
        }
    }
    collectCommentFolding(document, node, acceptor) {
        const cstNode = node.$cstNode;
        if (cstNode) {
            for (const node of flattenCst(cstNode)) {
                if (this.commentNames.includes(node.tokenType.name)) {
                    const foldingRange = this.toFoldingRange(document, node, FoldingRangeKind.Comment);
                    if (foldingRange) {
                        acceptor(foldingRange);
                    }
                }
            }
        }
    }
    toFoldingRange(document, node, kind) {
        const range = node.range;
        const start = range.start;
        let end = range.end;
        // Don't generate foldings for nodes that are less than 3 lines
        if (end.line - start.line < 2) {
            return undefined;
        }
        // As we don't want to hide the end token like 'if { ... --> } <--',
        // we simply select the end of the previous line as the end position
        if (!this.includeLastFoldingLine(node, kind)) {
            end = document.textDocument.positionAt(document.textDocument.offsetAt({ line: end.line, character: 0 }) - 1);
        }
        return FoldingRange.create(start.line, end.line, start.character, end.character, kind);
    }
    /**
     * Template method to determine whether the folding range for this cst node should include its last line.
     * Returns false by default for ast nodes which end in braces and for comments.
     */
    includeLastFoldingLine(node, kind) {
        if (kind === FoldingRangeKind.Comment) {
            return false;
        }
        const nodeText = node.text;
        const endChar = nodeText.charAt(nodeText.length - 1);
        if (endChar === '}' || endChar === ')' || endChar === ']') {
            return false;
        }
        return true;
    }
}
//# sourceMappingURL=folding-range-provider.js.map