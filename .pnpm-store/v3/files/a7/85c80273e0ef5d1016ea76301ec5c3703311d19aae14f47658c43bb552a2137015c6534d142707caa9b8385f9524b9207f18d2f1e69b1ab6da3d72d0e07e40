import { TextDocumentIdentifier, Range, uinteger, SemanticTokensEdit, SemanticTokensLegend, SemanticTokens, SemanticTokensDelta } from 'vscode-languageserver-types';
import { RequestHandler0, RequestHandler } from 'vscode-jsonrpc';
import { MessageDirection, ProtocolRequestType, ProtocolRequestType0, RegistrationType } from './messages';
import type { PartialResultParams, WorkDoneProgressParams, WorkDoneProgressOptions, TextDocumentRegistrationOptions, StaticRegistrationOptions } from './protocol';
/**
 * @since 3.16.0
 */
export interface SemanticTokensPartialResult {
    data: uinteger[];
}
/**
 * @since 3.16.0
 */
export interface SemanticTokensDeltaPartialResult {
    edits: SemanticTokensEdit[];
}
export declare namespace TokenFormat {
    const Relative: 'relative';
}
export type TokenFormat = 'relative';
/**
 * @since 3.16.0
 */
export interface SemanticTokensClientCapabilities {
    /**
     * Whether implementation supports dynamic registration. If this is set to `true`
     * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
     * return value for the corresponding server capability as well.
     */
    dynamicRegistration?: boolean;
    /**
     * Which requests the client supports and might send to the server
     * depending on the server's capability. Please note that clients might not
     * show semantic tokens or degrade some of the user experience if a range
     * or full request is advertised by the client but not provided by the
     * server. If for example the client capability `requests.full` and
     * `request.range` are both set to true but the server only provides a
     * range provider the client might not render a minimap correctly or might
     * even decide to not show any semantic tokens at all.
     */
    requests: {
        /**
         * The client will send the `textDocument/semanticTokens/range` request if
         * the server provides a corresponding handler.
         */
        range?: boolean | {};
        /**
         * The client will send the `textDocument/semanticTokens/full` request if
         * the server provides a corresponding handler.
         */
        full?: boolean | {
            /**
             * The client will send the `textDocument/semanticTokens/full/delta` request if
             * the server provides a corresponding handler.
             */
            delta?: boolean;
        };
    };
    /**
     * The token types that the client supports.
     */
    tokenTypes: string[];
    /**
     * The token modifiers that the client supports.
     */
    tokenModifiers: string[];
    /**
     * The token formats the clients supports.
     */
    formats: TokenFormat[];
    /**
     * Whether the client supports tokens that can overlap each other.
     */
    overlappingTokenSupport?: boolean;
    /**
     * Whether the client supports tokens that can span multiple lines.
     */
    multilineTokenSupport?: boolean;
    /**
     * Whether the client allows the server to actively cancel a
     * semantic token request, e.g. supports returning
     * LSPErrorCodes.ServerCancelled. If a server does the client
     * needs to retrigger the request.
     *
     * @since 3.17.0
     */
    serverCancelSupport?: boolean;
    /**
     * Whether the client uses semantic tokens to augment existing
     * syntax tokens. If set to `true` client side created syntax
     * tokens and semantic tokens are both used for colorization. If
     * set to `false` the client only uses the returned semantic tokens
     * for colorization.
     *
     * If the value is `undefined` then the client behavior is not
     * specified.
     *
     * @since 3.17.0
     */
    augmentsSyntaxTokens?: boolean;
}
/**
 * @since 3.16.0
 */
export interface SemanticTokensOptions extends WorkDoneProgressOptions {
    /**
     * The legend used by the server
     */
    legend: SemanticTokensLegend;
    /**
     * Server supports providing semantic tokens for a specific range
     * of a document.
     */
    range?: boolean | {};
    /**
     * Server supports providing semantic tokens for a full document.
     */
    full?: boolean | {
        /**
         * The server supports deltas for full documents.
         */
        delta?: boolean;
    };
}
/**
 * @since 3.16.0
 */
export interface SemanticTokensRegistrationOptions extends TextDocumentRegistrationOptions, SemanticTokensOptions, StaticRegistrationOptions {
}
export declare namespace SemanticTokensRegistrationType {
    const method: 'textDocument/semanticTokens';
    const type: RegistrationType<SemanticTokensRegistrationOptions>;
}
/**
 * @since 3.16.0
 */
export interface SemanticTokensParams extends WorkDoneProgressParams, PartialResultParams {
    /**
     * The text document.
     */
    textDocument: TextDocumentIdentifier;
}
/**
 * @since 3.16.0
 */
export declare namespace SemanticTokensRequest {
    const method: 'textDocument/semanticTokens/full';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<SemanticTokensParams, SemanticTokens | null, SemanticTokensPartialResult, void, SemanticTokensRegistrationOptions>;
    const registrationMethod: typeof SemanticTokensRegistrationType.method;
    type HandlerSignature = RequestHandler<SemanticTokensDeltaParams, SemanticTokens | null, void>;
}
/**
 * @since 3.16.0
 */
export interface SemanticTokensDeltaParams extends WorkDoneProgressParams, PartialResultParams {
    /**
     * The text document.
     */
    textDocument: TextDocumentIdentifier;
    /**
     * The result id of a previous response. The result Id can either point to a full response
     * or a delta response depending on what was received last.
     */
    previousResultId: string;
}
/**
 * @since 3.16.0
 */
export declare namespace SemanticTokensDeltaRequest {
    const method: 'textDocument/semanticTokens/full/delta';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<SemanticTokensDeltaParams, SemanticTokens | SemanticTokensDelta | null, SemanticTokensPartialResult | SemanticTokensDeltaPartialResult, void, SemanticTokensRegistrationOptions>;
    const registrationMethod: typeof SemanticTokensRegistrationType.method;
    type HandlerSignature = RequestHandler<SemanticTokensDeltaParams, SemanticTokens | SemanticTokensDelta | null, void>;
}
/**
 * @since 3.16.0
 */
export interface SemanticTokensRangeParams extends WorkDoneProgressParams, PartialResultParams {
    /**
     * The text document.
     */
    textDocument: TextDocumentIdentifier;
    /**
     * The range the semantic tokens are requested for.
     */
    range: Range;
}
/**
 * @since 3.16.0
 */
export declare namespace SemanticTokensRangeRequest {
    const method: 'textDocument/semanticTokens/range';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<SemanticTokensRangeParams, SemanticTokens | null, SemanticTokensPartialResult, void, void>;
    const registrationMethod: typeof SemanticTokensRegistrationType.method;
    type HandlerSignature = RequestHandler<SemanticTokensRangeParams, SemanticTokens | null, void>;
}
/**
 * @since 3.16.0
 */
export interface SemanticTokensWorkspaceClientCapabilities {
    /**
     * Whether the client implementation supports a refresh request sent from
     * the server to the client.
     *
     * Note that this event is global and will force the client to refresh all
     * semantic tokens currently shown. It should be used with absolute care
     * and is useful for situation where a server for example detects a project
     * wide change that requires such a calculation.
     */
    refreshSupport?: boolean;
}
/**
 * @since 3.16.0
 */
export declare namespace SemanticTokensRefreshRequest {
    const method: `workspace/semanticTokens/refresh`;
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType0<void, void, void, void>;
    type HandlerSignature = RequestHandler0<void, void>;
}
