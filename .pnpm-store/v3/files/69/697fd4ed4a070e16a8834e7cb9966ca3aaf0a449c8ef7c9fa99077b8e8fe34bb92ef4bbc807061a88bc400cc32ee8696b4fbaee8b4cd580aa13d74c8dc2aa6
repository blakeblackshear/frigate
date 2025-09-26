import { RequestHandler } from 'vscode-jsonrpc';
import { CallHierarchyItem, CallHierarchyIncomingCall, CallHierarchyOutgoingCall } from 'vscode-languageserver-types';
import { MessageDirection, ProtocolRequestType } from './messages';
import type { TextDocumentRegistrationOptions, StaticRegistrationOptions, TextDocumentPositionParams, PartialResultParams, WorkDoneProgressParams, WorkDoneProgressOptions } from './protocol';
/**
 * @since 3.16.0
 */
export interface CallHierarchyClientCapabilities {
    /**
     * Whether implementation supports dynamic registration. If this is set to `true`
     * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
     * return value for the corresponding server capability as well.
     */
    dynamicRegistration?: boolean;
}
/**
 * Call hierarchy options used during static registration.
 *
 * @since 3.16.0
 */
export interface CallHierarchyOptions extends WorkDoneProgressOptions {
}
/**
 * Call hierarchy options used during static or dynamic registration.
 *
 * @since 3.16.0
 */
export interface CallHierarchyRegistrationOptions extends TextDocumentRegistrationOptions, CallHierarchyOptions, StaticRegistrationOptions {
}
/**
 * The parameter of a `textDocument/prepareCallHierarchy` request.
 *
 * @since 3.16.0
 */
export interface CallHierarchyPrepareParams extends TextDocumentPositionParams, WorkDoneProgressParams {
}
/**
 * A request to result a `CallHierarchyItem` in a document at a given position.
 * Can be used as an input to an incoming or outgoing call hierarchy.
 *
 * @since 3.16.0
 */
export declare namespace CallHierarchyPrepareRequest {
    const method: 'textDocument/prepareCallHierarchy';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<CallHierarchyPrepareParams, CallHierarchyItem[] | null, never, void, CallHierarchyRegistrationOptions>;
    type HandlerSignature = RequestHandler<CallHierarchyPrepareParams, CallHierarchyItem[] | null, void>;
}
/**
 * The parameter of a `callHierarchy/incomingCalls` request.
 *
 * @since 3.16.0
 */
export interface CallHierarchyIncomingCallsParams extends WorkDoneProgressParams, PartialResultParams {
    item: CallHierarchyItem;
}
/**
 * A request to resolve the incoming calls for a given `CallHierarchyItem`.
 *
 * @since 3.16.0
 */
export declare namespace CallHierarchyIncomingCallsRequest {
    const method: 'callHierarchy/incomingCalls';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<CallHierarchyIncomingCallsParams, CallHierarchyIncomingCall[] | null, CallHierarchyIncomingCall[], void, void>;
    type HandlerSignature = RequestHandler<CallHierarchyIncomingCallsParams, CallHierarchyIncomingCall[] | null, void>;
}
/**
 * The parameter of a `callHierarchy/outgoingCalls` request.
 *
 * @since 3.16.0
 */
export interface CallHierarchyOutgoingCallsParams extends WorkDoneProgressParams, PartialResultParams {
    item: CallHierarchyItem;
}
/**
 * A request to resolve the outgoing calls for a given `CallHierarchyItem`.
 *
 * @since 3.16.0
 */
export declare namespace CallHierarchyOutgoingCallsRequest {
    const method: 'callHierarchy/outgoingCalls';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<CallHierarchyOutgoingCallsParams, CallHierarchyOutgoingCall[] | null, CallHierarchyOutgoingCall[], void, void>;
    type HandlerSignature = RequestHandler<CallHierarchyOutgoingCallsParams, CallHierarchyOutgoingCall[] | null, void>;
}
