import { RequestType, RequestType0, NotificationType, NotificationType0, ProgressType, _EM } from 'vscode-jsonrpc';
export declare enum MessageDirection {
    clientToServer = "clientToServer",
    serverToClient = "serverToClient",
    both = "both"
}
export declare class RegistrationType<RO> {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    readonly ____: [RO, _EM] | undefined;
    readonly method: string;
    constructor(method: string);
}
export declare class ProtocolRequestType0<R, PR, E, RO> extends RequestType0<R, E> implements ProgressType<PR>, RegistrationType<RO> {
    /**
     * Clients must not use these properties. They are here to ensure correct typing.
     * in TypeScript
     */
    readonly __: [PR, _EM] | undefined;
    readonly ___: [PR, RO, _EM] | undefined;
    readonly ____: [RO, _EM] | undefined;
    readonly _pr: PR | undefined;
    constructor(method: string);
}
export declare class ProtocolRequestType<P, R, PR, E, RO> extends RequestType<P, R, E> implements ProgressType<PR>, RegistrationType<RO> {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    readonly __: [PR, _EM] | undefined;
    readonly ___: [PR, RO, _EM] | undefined;
    readonly ____: [RO, _EM] | undefined;
    readonly _pr: PR | undefined;
    constructor(method: string);
}
export declare class ProtocolNotificationType0<RO> extends NotificationType0 implements RegistrationType<RO> {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    readonly ___: [RO, _EM] | undefined;
    readonly ____: [RO, _EM] | undefined;
    constructor(method: string);
}
export declare class ProtocolNotificationType<P, RO> extends NotificationType<P> implements RegistrationType<RO> {
    /**
     * Clients must not use this property. It is here to ensure correct typing.
     */
    readonly ___: [RO, _EM] | undefined;
    readonly ____: [RO, _EM] | undefined;
    constructor(method: string);
}
