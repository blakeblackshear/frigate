/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { SymbolKind } from 'vscode-languageserver';
import { AbstractCallHierarchyProvider } from '../../lsp/call-hierarchy-provider.js';
import { getContainerOfType, getDocument, streamAllContents } from '../../utils/ast-utils.js';
import { findLeafNodeAtOffset } from '../../utils/cst-utils.js';
import { isParserRule, isRuleCall } from '../../languages/generated/ast.js';
export class LangiumGrammarCallHierarchyProvider extends AbstractCallHierarchyProvider {
    getIncomingCalls(node, references) {
        if (!isParserRule(node)) {
            return undefined;
        }
        // This map is used to group incoming calls to avoid duplicates.
        const uniqueRules = new Map();
        references.forEach(ref => {
            const doc = this.documents.getDocument(ref.sourceUri);
            if (!doc) {
                return;
            }
            const rootNode = doc.parseResult.value;
            if (!rootNode.$cstNode) {
                return;
            }
            const targetNode = findLeafNodeAtOffset(rootNode.$cstNode, ref.segment.offset);
            if (!targetNode) {
                return;
            }
            const parserRule = getContainerOfType(targetNode.astNode, isParserRule);
            if (!parserRule || !parserRule.$cstNode) {
                return;
            }
            const nameNode = this.nameProvider.getNameNode(parserRule);
            if (!nameNode) {
                return;
            }
            const refDocUri = ref.sourceUri.toString();
            const ruleId = refDocUri + '@' + nameNode.text;
            uniqueRules.has(ruleId) ?
                uniqueRules.set(ruleId, { parserRule: parserRule.$cstNode, nameNode, targetNodes: [...uniqueRules.get(ruleId).targetNodes, targetNode], docUri: refDocUri })
                : uniqueRules.set(ruleId, { parserRule: parserRule.$cstNode, nameNode, targetNodes: [targetNode], docUri: refDocUri });
        });
        if (uniqueRules.size === 0) {
            return undefined;
        }
        return Array.from(uniqueRules.values()).map(rule => ({
            from: {
                kind: SymbolKind.Method,
                name: rule.nameNode.text,
                range: rule.parserRule.range,
                selectionRange: rule.nameNode.range,
                uri: rule.docUri
            },
            fromRanges: rule.targetNodes.map(node => node.range)
        }));
    }
    getOutgoingCalls(node) {
        if (!isParserRule(node)) {
            return undefined;
        }
        const ruleCalls = streamAllContents(node).filter(isRuleCall).toArray();
        // This map is used to group outgoing calls to avoid duplicates.
        const uniqueRules = new Map();
        ruleCalls.forEach(ruleCall => {
            var _a;
            const cstNode = ruleCall.$cstNode;
            if (!cstNode) {
                return;
            }
            const refCstNode = (_a = ruleCall.rule.ref) === null || _a === void 0 ? void 0 : _a.$cstNode;
            if (!refCstNode) {
                return;
            }
            const refNameNode = this.nameProvider.getNameNode(refCstNode.astNode);
            if (!refNameNode) {
                return;
            }
            const refDocUri = getDocument(refCstNode.astNode).uri.toString();
            const ruleId = refDocUri + '@' + refNameNode.text;
            uniqueRules.has(ruleId) ?
                uniqueRules.set(ruleId, { refCstNode: refCstNode, to: refNameNode, from: [...uniqueRules.get(ruleId).from, cstNode.range], docUri: refDocUri })
                : uniqueRules.set(ruleId, { refCstNode: refCstNode, to: refNameNode, from: [cstNode.range], docUri: refDocUri });
        });
        if (uniqueRules.size === 0) {
            return undefined;
        }
        return Array.from(uniqueRules.values()).map(rule => ({
            to: {
                kind: SymbolKind.Method,
                name: rule.to.text,
                range: rule.refCstNode.range,
                selectionRange: rule.to.range,
                uri: rule.docUri
            },
            fromRanges: rule.from
        }));
    }
}
//# sourceMappingURL=grammar-call-hierarchy.js.map