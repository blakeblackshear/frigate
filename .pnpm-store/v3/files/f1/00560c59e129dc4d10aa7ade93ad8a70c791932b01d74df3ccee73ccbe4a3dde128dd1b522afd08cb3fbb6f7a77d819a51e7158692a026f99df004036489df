import { Emitter } from 'strict-event-emitter';
import { WebSocketClientConnectionProtocol, WebSocketServerConnectionProtocol, WebSocketConnectionData } from '@mswjs/interceptors/WebSocket';
import { PathParams, Path, Match } from '../utils/matching/matchRequestUrl.mjs';

type WebSocketHandlerParsedResult = {
    match: Match;
};
type WebSocketHandlerEventMap = {
    connection: [args: WebSocketHandlerConnection];
};
interface WebSocketHandlerConnection {
    client: WebSocketClientConnectionProtocol;
    server: WebSocketServerConnectionProtocol;
    info: WebSocketConnectionData['info'];
    params: PathParams;
}
interface WebSocketResolutionContext {
    baseUrl?: string;
}
declare const kEmitter: unique symbol;
declare const kSender: unique symbol;
declare class WebSocketHandler {
    private readonly url;
    private readonly __kind;
    id: string;
    callFrame?: string;
    protected [kEmitter]: Emitter<WebSocketHandlerEventMap>;
    constructor(url: Path);
    parse(args: {
        url: URL;
        resolutionContext?: WebSocketResolutionContext;
    }): WebSocketHandlerParsedResult;
    predicate(args: {
        url: URL;
        parsedResult: WebSocketHandlerParsedResult;
    }): boolean;
    run(connection: Omit<WebSocketHandlerConnection, 'params'>, resolutionContext?: WebSocketResolutionContext): Promise<boolean>;
    protected connect(connection: WebSocketHandlerConnection): boolean;
}

export { WebSocketHandler, type WebSocketHandlerConnection, type WebSocketHandlerEventMap, type WebSocketResolutionContext, kEmitter, kSender };
