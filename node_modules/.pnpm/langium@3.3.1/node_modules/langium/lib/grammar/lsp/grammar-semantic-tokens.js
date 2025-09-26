/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { SemanticTokenTypes } from 'vscode-languageserver';
import { AbstractSemanticTokenProvider } from '../../lsp/semantic-token-provider.js';
import { isAction, isAssignment, isParameter, isParameterReference, isReturnType, isRuleCall, isSimpleType, isTypeAttribute } from '../../languages/generated/ast.js';
export class LangiumGrammarSemanticTokenProvider extends AbstractSemanticTokenProvider {
    highlightElement(node, acceptor) {
        var _a;
        if (isAssignment(node)) {
            acceptor({
                node,
                property: 'feature',
                type: SemanticTokenTypes.property
            });
        }
        else if (isAction(node)) {
            if (node.feature) {
                acceptor({
                    node,
                    property: 'feature',
                    type: SemanticTokenTypes.property
                });
            }
        }
        else if (isReturnType(node)) {
            acceptor({
                node,
                property: 'name',
                type: SemanticTokenTypes.type
            });
        }
        else if (isSimpleType(node)) {
            if (node.primitiveType || node.typeRef) {
                acceptor({
                    node,
                    property: node.primitiveType ? 'primitiveType' : 'typeRef',
                    type: SemanticTokenTypes.type
                });
            }
        }
        else if (isParameter(node)) {
            acceptor({
                node,
                property: 'name',
                type: SemanticTokenTypes.parameter
            });
        }
        else if (isParameterReference(node)) {
            acceptor({
                node,
                property: 'parameter',
                type: SemanticTokenTypes.parameter
            });
        }
        else if (isRuleCall(node)) {
            if ((_a = node.rule.ref) === null || _a === void 0 ? void 0 : _a.fragment) {
                acceptor({
                    node,
                    property: 'rule',
                    type: SemanticTokenTypes.type
                });
            }
        }
        else if (isTypeAttribute(node)) {
            acceptor({
                node,
                property: 'name',
                type: SemanticTokenTypes.property
            });
        }
    }
}
//# sourceMappingURL=grammar-semantic-tokens.js.map