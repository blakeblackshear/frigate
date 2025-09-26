/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { CallHierarchyIncomingCall, CallHierarchyIncomingCallsParams, CallHierarchyItem, CallHierarchyOutgoingCall, CallHierarchyOutgoingCallsParams, CallHierarchyPrepareParams } from 'vscode-languageserver';
import type { CancellationToken } from '../utils/cancellation.js';
import type { GrammarConfig } from '../languages/grammar-config.js';
import type { NameProvider } from '../references/name-provider.js';
import type { References } from '../references/references.js';
import type { LangiumServices } from './lsp-services.js';
import type { AstNode } from '../syntax-tree.js';
import type { Stream } from '../utils/stream.js';
import type { ReferenceDescription } from '../workspace/ast-descriptions.js';
import type { LangiumDocument, LangiumDocuments } from '../workspace/documents.js';
import type { MaybePromise } from '../utils/promise-utils.js';
/**
 * Language-specific service for handling call hierarchy requests.
 */
export interface CallHierarchyProvider {
    prepareCallHierarchy(document: LangiumDocument, params: CallHierarchyPrepareParams, cancelToken?: CancellationToken): MaybePromise<CallHierarchyItem[] | undefined>;
    incomingCalls(params: CallHierarchyIncomingCallsParams, cancelToken?: CancellationToken): MaybePromise<CallHierarchyIncomingCall[] | undefined>;
    outgoingCalls(params: CallHierarchyOutgoingCallsParams, cancelToken?: CancellationToken): MaybePromise<CallHierarchyOutgoingCall[] | undefined>;
}
export declare abstract class AbstractCallHierarchyProvider implements CallHierarchyProvider {
    protected readonly grammarConfig: GrammarConfig;
    protected readonly nameProvider: NameProvider;
    protected readonly documents: LangiumDocuments;
    protected readonly references: References;
    constructor(services: LangiumServices);
    prepareCallHierarchy(document: LangiumDocument<AstNode>, params: CallHierarchyPrepareParams): MaybePromise<CallHierarchyItem[] | undefined>;
    protected getCallHierarchyItems(targetNode: AstNode, document: LangiumDocument<AstNode>): CallHierarchyItem[] | undefined;
    protected getCallHierarchyItem(_targetNode: AstNode): Partial<CallHierarchyItem> | undefined;
    incomingCalls(params: CallHierarchyIncomingCallsParams): Promise<CallHierarchyIncomingCall[] | undefined>;
    /**
     * Override this method to collect the incoming calls for your language
     */
    protected abstract getIncomingCalls(node: AstNode, references: Stream<ReferenceDescription>): MaybePromise<CallHierarchyIncomingCall[] | undefined>;
    outgoingCalls(params: CallHierarchyOutgoingCallsParams): Promise<CallHierarchyOutgoingCall[] | undefined>;
    /**
     * Override this method to collect the outgoing calls for your language
     */
    protected abstract getOutgoingCalls(node: AstNode): MaybePromise<CallHierarchyOutgoingCall[] | undefined>;
}
//# sourceMappingURL=call-hierarchy-provider.d.ts.map