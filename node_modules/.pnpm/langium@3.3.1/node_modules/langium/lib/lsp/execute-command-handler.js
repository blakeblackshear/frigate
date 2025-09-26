/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CancellationToken } from '../utils/cancellation.js';
export class AbstractExecuteCommandHandler {
    get commands() {
        return Array.from(this.registeredCommands.keys());
    }
    constructor() {
        this.registeredCommands = new Map();
        this.registerCommands(this.createCommandAcceptor());
    }
    async executeCommand(name, args, cancelToken = CancellationToken.None) {
        const command = this.registeredCommands.get(name);
        if (command) {
            return command(args, cancelToken);
        }
        else {
            return undefined;
        }
    }
    createCommandAcceptor() {
        return (name, execute) => this.registeredCommands.set(name, execute);
    }
}
//# sourceMappingURL=execute-command-handler.js.map