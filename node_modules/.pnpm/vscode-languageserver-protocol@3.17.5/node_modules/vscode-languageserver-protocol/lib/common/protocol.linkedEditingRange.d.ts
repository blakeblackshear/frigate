import { RequestHandler } from 'vscode-jsonrpc';
import { Range } from 'vscode-languageserver-types';
import { MessageDirection, ProtocolRequestType } from './messages';
import type { StaticRegistrationOptions, TextDocumentPositionParams, TextDocumentRegistrationOptions, WorkDoneProgressOptions, WorkDoneProgressParams } from './protocol';
/**
 * Client capabilities for the linked editing range request.
 *
 * @since 3.16.0
 */
export interface LinkedEditingRangeClientCapabilities {
    /**
     * Whether implementation supports dynamic registration. If this is set to `true`
     * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
     * return value for the corresponding server capability as well.
     */
    dynamicRegistration?: boolean;
}
export interface LinkedEditingRangeParams extends TextDocumentPositionParams, WorkDoneProgressParams {
}
export interface LinkedEditingRangeOptions extends WorkDoneProgressOptions {
}
export interface LinkedEditingRangeRegistrationOptions extends TextDocumentRegistrationOptions, LinkedEditingRangeOptions, StaticRegistrationOptions {
}
/**
 * The result of a linked editing range request.
 *
 * @since 3.16.0
 */
export interface LinkedEditingRanges {
    /**
     * A list of ranges that can be edited together. The ranges must have
     * identical length and contain identical text content. The ranges cannot overlap.
     */
    ranges: Range[];
    /**
     * An optional word pattern (regular expression) that describes valid contents for
     * the given ranges. If no pattern is provided, the client configuration's word
     * pattern will be used.
     */
    wordPattern?: string;
}
/**
 * A request to provide ranges that can be edited together.
 *
 * @since 3.16.0
 */
export declare namespace LinkedEditingRangeRequest {
    const method: 'textDocument/linkedEditingRange';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<LinkedEditingRangeParams, LinkedEditingRanges | null, void, void, LinkedEditingRangeRegistrationOptions>;
    type HandlerSignature = RequestHandler<LinkedEditingRangeParams, LinkedEditingRanges | null, void>;
}
