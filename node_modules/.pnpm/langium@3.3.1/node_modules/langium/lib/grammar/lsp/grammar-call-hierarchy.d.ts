/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { CallHierarchyIncomingCall, CallHierarchyOutgoingCall } from 'vscode-languageserver';
import type { AstNode } from '../../syntax-tree.js';
import type { Stream } from '../../utils/stream.js';
import type { ReferenceDescription } from '../../workspace/ast-descriptions.js';
import { AbstractCallHierarchyProvider } from '../../lsp/call-hierarchy-provider.js';
export declare class LangiumGrammarCallHierarchyProvider extends AbstractCallHierarchyProvider {
    protected getIncomingCalls(node: AstNode, references: Stream<ReferenceDescription>): CallHierarchyIncomingCall[] | undefined;
    protected getOutgoingCalls(node: AstNode): CallHierarchyOutgoingCall[] | undefined;
}
//# sourceMappingURL=grammar-call-hierarchy.d.ts.map