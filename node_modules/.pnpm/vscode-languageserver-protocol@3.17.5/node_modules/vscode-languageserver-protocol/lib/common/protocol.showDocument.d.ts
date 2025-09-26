import { HandlerResult, RequestHandler } from 'vscode-jsonrpc';
import { Range, URI } from 'vscode-languageserver-types';
import { MessageDirection, ProtocolRequestType } from './messages';
/**
 * Client capabilities for the showDocument request.
 *
 * @since 3.16.0
 */
export interface ShowDocumentClientCapabilities {
    /**
     * The client has support for the showDocument
     * request.
     */
    support: boolean;
}
/**
 * Params to show a resource in the UI.
 *
 * @since 3.16.0
 */
export interface ShowDocumentParams {
    /**
     * The uri to show.
     */
    uri: URI;
    /**
     * Indicates to show the resource in an external program.
     * To show, for example, `https://code.visualstudio.com/`
     * in the default WEB browser set `external` to `true`.
     */
    external?: boolean;
    /**
     * An optional property to indicate whether the editor
     * showing the document should take focus or not.
     * Clients might ignore this property if an external
     * program is started.
     */
    takeFocus?: boolean;
    /**
     * An optional selection range if the document is a text
     * document. Clients might ignore the property if an
     * external program is started or the file is not a text
     * file.
     */
    selection?: Range;
}
/**
 * The result of a showDocument request.
 *
 * @since 3.16.0
 */
export interface ShowDocumentResult {
    /**
     * A boolean indicating if the show was successful.
     */
    success: boolean;
}
/**
 * A request to show a document. This request might open an
 * external program depending on the value of the URI to open.
 * For example a request to open `https://code.visualstudio.com/`
 * will very likely open the URI in a WEB browser.
 *
 * @since 3.16.0
*/
export declare namespace ShowDocumentRequest {
    const method: 'window/showDocument';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<ShowDocumentParams, ShowDocumentResult, void, void, void>;
    type HandlerSignature = RequestHandler<ShowDocumentParams, ShowDocumentResult, void>;
    type MiddlewareSignature = (params: ShowDocumentParams, next: HandlerSignature) => HandlerResult<ShowDocumentResult, void>;
}
