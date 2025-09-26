/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import type { MaybePromise } from '../utils/promise-utils.js';
import { CancellationToken } from '../utils/cancellation.js';
export interface ExecuteCommandHandler {
    get commands(): string[];
    executeCommand(name: string, args: any[], cancelToken?: CancellationToken): Promise<unknown>;
}
export type ExecuteCommandFunction = (args: any[], cancelToken: CancellationToken) => MaybePromise<unknown>;
export type ExecuteCommandAcceptor = (name: string, execute: ExecuteCommandFunction) => void;
export declare abstract class AbstractExecuteCommandHandler implements ExecuteCommandHandler {
    protected registeredCommands: Map<string, ExecuteCommandFunction>;
    get commands(): string[];
    constructor();
    executeCommand(name: string, args: any[], cancelToken?: CancellationToken): Promise<unknown>;
    protected createCommandAcceptor(): ExecuteCommandAcceptor;
    abstract registerCommands(acceptor: ExecuteCommandAcceptor): void;
}
//# sourceMappingURL=execute-command-handler.d.ts.map