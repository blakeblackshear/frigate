import { RequestHandler, HandlerResult, CancellationToken } from 'vscode-jsonrpc';
import { LSPAny, URI } from 'vscode-languageserver-types';
import { MessageDirection, ProtocolRequestType } from './messages';
/**
 * The 'workspace/configuration' request is sent from the server to the client to fetch a certain
 * configuration setting.
 *
 * This pull model replaces the old push model were the client signaled configuration change via an
 * event. If the server still needs to react to configuration changes (since the server caches the
 * result of `workspace/configuration` requests) the server should register for an empty configuration
 * change event and empty the cache if such an event is received.
 */
export declare namespace ConfigurationRequest {
    const method: 'workspace/configuration';
    const messageDirection: MessageDirection;
    const type: ProtocolRequestType<ConfigurationParams, any[], never, void, void>;
    type HandlerSignature = RequestHandler<ConfigurationParams, LSPAny[], void>;
    type MiddlewareSignature = (params: ConfigurationParams, token: CancellationToken, next: HandlerSignature) => HandlerResult<LSPAny[], void>;
}
export interface ConfigurationItem {
    /**
     * The scope to get the configuration section for.
     */
    scopeUri?: URI;
    /**
     * The configuration section asked for.
     */
    section?: string;
}
/**
 * The parameters of a configuration request.
 */
export interface ConfigurationParams {
    items: ConfigurationItem[];
}
