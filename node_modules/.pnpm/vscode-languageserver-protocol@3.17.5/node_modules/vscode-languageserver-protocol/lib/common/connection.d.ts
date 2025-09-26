import { Message, NotificationMessage, CancellationToken, RequestHandler0, RequestHandler, GenericRequestHandler, NotificationHandler0, NotificationHandler, GenericNotificationHandler, ProgressType, Trace, Tracer, TraceOptions, Disposable, Event, MessageReader, MessageWriter, Logger, ConnectionStrategy, ConnectionOptions, RequestType0, RequestType, NotificationType0, NotificationType } from 'vscode-jsonrpc';
import { ProtocolRequestType, ProtocolRequestType0, ProtocolNotificationType, ProtocolNotificationType0 } from './messages';
export interface ProtocolConnection {
    /**
     * Sends a request and returns a promise resolving to the result of the request.
     *
     * @param type The type of request to sent.
     * @param token An optional cancellation token.
     * @returns A promise resolving to the request's result.
     */
    sendRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, token?: CancellationToken): Promise<R>;
    sendRequest<R, E>(type: RequestType0<R, E>, token?: CancellationToken): Promise<R>;
    /**
     * Sends a request and returns a promise resolving to the result of the request.
     *
     * @param type The type of request to sent.
     * @param params The request's parameter.
     * @param token An optional cancellation token.
     * @returns A promise resolving to the request's result.
     */
    sendRequest<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, params: P, token?: CancellationToken): Promise<R>;
    sendRequest<P, R, E>(type: RequestType<P, R, E>, params: P, token?: CancellationToken): Promise<R>;
    /**
     * Sends a request and returns a promise resolving to the result of the request.
     *
     * @param method the method name.
     * @param token An optional cancellation token.
     * @returns A promise resolving to the request's result.
     */
    sendRequest<R>(method: string, token?: CancellationToken): Promise<R>;
    /**
     * Sends a request and returns a promise resolving to the result of the request.
     *
     * @param method the method name.
     * @param params The request's parameter.
     * @param token An optional cancellation token.
     * @returns A promise resolving to the request's result.
     */
    sendRequest<R>(method: string, param: any, token?: CancellationToken): Promise<R>;
    /**
     * Installs a request handler.
     *
     * @param type The request type to install the handler for.
     * @param handler The actual handler.
     * @returns A disposable to remove the handler.
     */
    onRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, handler: RequestHandler0<R, E>): Disposable;
    onRequest<R, E>(type: RequestType0<R, E>, handler: RequestHandler0<R, E>): Disposable;
    /**
     * Installs a request handler.
     *
     * @param type The request type to install the handler for.
     * @param handler The actual handler.
     * @returns A disposable to remove the handler.
     */
    onRequest<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, handler: RequestHandler<P, R, E>): Disposable;
    onRequest<P, R, E>(type: RequestType<P, R, E>, handler: RequestHandler<P, R, E>): Disposable;
    /**
     * Installs a request handler.
     *
     * @param methods the message method name to install a handler for.
     * @param handler The actual handler.
     * @returns A disposable to remove the handler.
     */
    onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): Disposable;
    /**
     * Returns true if the connection has a pending response.
     * Otherwise false is returned.
     */
    hasPendingResponse(): boolean;
    /**
     * Sends a notification.
     *
     * @param type the notification's type to send.
     * @returns A promise that resolves when the notification is written to the
     * network layer.
     */
    sendNotification(type: NotificationType0): Promise<void>;
    sendNotification<RO>(type: ProtocolNotificationType0<RO>): Promise<void>;
    /**
     * Sends a notification.
     *
     * @param type the notification's type to send.
     * @param params the notification's parameters.
     * @returns A promise that resolves when the notification is written to the
     * network layer.
     */
    sendNotification<P, RO>(type: ProtocolNotificationType<P, RO>, params?: P): Promise<void>;
    sendNotification<P>(type: NotificationType<P>, params?: P): Promise<void>;
    /**
     * Sends a notification.
     *
     * @param method the notification's method name.
     * @returns A promise that resolves when the notification is written to the
     * network layer.
     */
    sendNotification(method: string): Promise<void>;
    /**
     * Sends a notification.
     *
     * @param method the notification's method name.
     * @param params the notification's parameters.
     * @returns A promise that resolves when the notification is written to the
     * network layer.
     */
    sendNotification(method: string, params: any): Promise<void>;
    /**
     * Installs a notification handler.
     *
     * @param type The notification type to install the handler for.
     * @param handler The actual handler.
     * @returns A disposable to remove the handler.
     */
    onNotification<RO>(type: ProtocolNotificationType0<RO>, handler: NotificationHandler0): Disposable;
    onNotification(type: NotificationType0, handler: NotificationHandler0): Disposable;
    /**
     * Installs a notification handler.
     *
     * @param type The notification type to install the handler for.
     * @param handler The actual handler.
     * @returns A disposable to remove the handler.
     */
    onNotification<P, RO>(type: ProtocolNotificationType<P, RO>, handler: NotificationHandler<P>): Disposable;
    onNotification<P>(type: NotificationType<P>, handler: NotificationHandler<P>): Disposable;
    /**
     * Installs a notification handler.
     *
     * @param methods The message method name to install the handler for.
     * @param handler The actual handler.
     * @returns A disposable to remove the handler.
     */
    onNotification(method: string, handler: GenericNotificationHandler): Disposable;
    /**
     * Installs a progress handler for a given token.
     * @param type the progress type
     * @param token the token
     * @param handler the handler
     * @returns A disposable to remove the handler.
     */
    onProgress<P>(type: ProgressType<P>, token: string | number, handler: NotificationHandler<P>): Disposable;
    /**
     * Sends progress.
     * @param type the progress type
     * @param token the token to use
     * @param value the progress value
     * @returns A promise that resolves when the progress is written to the
     * network layer.
     */
    sendProgress<P>(type: ProgressType<P>, token: string | number, value: P): Promise<void>;
    /**
     * Enables tracing mode for the connection.
     * @returns A promise that resolves when the trace value is written to the
     * network layer.
     */
    trace(value: Trace, tracer: Tracer, sendNotification?: boolean): Promise<void>;
    trace(value: Trace, tracer: Tracer, traceOptions?: TraceOptions): Promise<void>;
    /**
     * An event emitter firing when an error occurs on the connection.
     */
    onError: Event<[Error, Message | undefined, number | undefined]>;
    /**
     * An event emitter firing when the connection got closed.
     */
    onClose: Event<void>;
    /**
     * An event emitter firing when the connection receives a notification that is not
     * handled.
     */
    onUnhandledNotification: Event<NotificationMessage>;
    /**
     * An event emitter firing when the connection got disposed.
     */
    onDispose: Event<void>;
    /**
     * Ends the connection.
     */
    end(): void;
    /**
     * Actively disposes the connection.
     */
    dispose(): void;
    /**
     * Turns the connection into listening mode
     */
    listen(): void;
}
export declare function createProtocolConnection(input: MessageReader, output: MessageWriter, logger?: Logger, options?: ConnectionStrategy | ConnectionOptions): ProtocolConnection;
