/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { MaybePromise } from '../utils/promise-utils.js';
import { CancellationToken } from '../utils/cancellation.js';

export interface ExecuteCommandHandler {
    get commands(): string[]
    executeCommand(name: string, args: any[], cancelToken?: CancellationToken): Promise<unknown>
}

export type ExecuteCommandFunction = (args: any[], cancelToken: CancellationToken) => MaybePromise<unknown>

export type ExecuteCommandAcceptor = (name: string, execute: ExecuteCommandFunction) => void;

export abstract class AbstractExecuteCommandHandler implements ExecuteCommandHandler {

    protected registeredCommands = new Map<string, ExecuteCommandFunction>();

    get commands(): string[] {
        return Array.from(this.registeredCommands.keys());
    }

    constructor() {
        this.registerCommands(this.createCommandAcceptor());
    }

    async executeCommand(name: string, args: any[], cancelToken = CancellationToken.None): Promise<unknown> {
        const command = this.registeredCommands.get(name);
        if (command) {
            return command(args, cancelToken);
        } else {
            return undefined;
        }
    }

    protected createCommandAcceptor(): ExecuteCommandAcceptor {
        return (name, execute) => this.registeredCommands.set(name, execute);
    }

    abstract registerCommands(acceptor: ExecuteCommandAcceptor): void;
}
