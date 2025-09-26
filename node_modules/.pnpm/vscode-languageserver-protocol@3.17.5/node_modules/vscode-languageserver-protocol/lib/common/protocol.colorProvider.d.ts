import { RequestHandler } from 'vscode-jsonrpc';
import { TextDocumentIdentifier, Range, Color, ColorInformation, ColorPresentation } from 'vscode-languageserver-types';
import { MessageDirection, ProtocolRequestType } from './messages';
import type { TextDocumentRegistrationOptions, StaticRegistrationOptions, PartialResultParams, WorkDoneProgressParams, WorkDoneProgressOptions } from './protocol';
export interface DocumentColorClientCapabilities {
    /**
     * Whether implementation supports dynamic registration. If this is set to `true`
     * the client supports the new `DocumentColorRegistrationOptions` return value
     * for the corresponding server capability as well.
     */
    dynamicRegistration?: boolean;
}
export interface DocumentColorOptions extends WorkDoneProgressOptions {
}
export interface DocumentColorRegistrationOptions extends TextDocumentRegistrationOptions, StaticRegistrationOptions, DocumentColorOptions {
}
/**
 * Parameters for a {@link DocumentColorRequest}.
 */
export interface DocumentColorParams extends WorkDoneProgressParams, PartialResultParams {
    /**
     * The text document.
     */
    textDocument: TextDocumentIdentifier;
}
/**
 * A request to list all color symbols found in a given text document. The request's
 * parameter is of type {@link DocumentColorParams} the
 * response is of type {@link ColorInformation ColorInformation[]} or a Thenable
 * that resolves to such.
 */
export declare namespace DocumentColorRequest {
    const method: 'textDocument/documentColor';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<DocumentColorParams, ColorInformation[], ColorInformation[], void, DocumentColorRegistrationOptions>;
    type HandlerSignature = RequestHandler<DocumentColorParams, ColorInformation[], void>;
}
/**
 * Parameters for a {@link ColorPresentationRequest}.
 */
export interface ColorPresentationParams extends WorkDoneProgressParams, PartialResultParams {
    /**
     * The text document.
     */
    textDocument: TextDocumentIdentifier;
    /**
     * The color to request presentations for.
     */
    color: Color;
    /**
     * The range where the color would be inserted. Serves as a context.
     */
    range: Range;
}
/**
 * A request to list all presentation for a color. The request's
 * parameter is of type {@link ColorPresentationParams} the
 * response is of type {@link ColorInformation ColorInformation[]} or a Thenable
 * that resolves to such.
 */
export declare namespace ColorPresentationRequest {
    const method: 'textDocument/colorPresentation';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<ColorPresentationParams, ColorPresentation[], ColorPresentation[], void, WorkDoneProgressOptions & TextDocumentRegistrationOptions>;
    type HandlerSignature = RequestHandler<ColorPresentationParams, ColorPresentation[], void>;
}
