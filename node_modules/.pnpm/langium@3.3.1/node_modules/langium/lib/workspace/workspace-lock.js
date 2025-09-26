/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CancellationToken, CancellationTokenSource } from '../utils/cancellation.js';
import { Deferred, isOperationCancelled, startCancelableOperation } from '../utils/promise-utils.js';
export class DefaultWorkspaceLock {
    constructor() {
        this.previousTokenSource = new CancellationTokenSource();
        this.writeQueue = [];
        this.readQueue = [];
        this.done = true;
    }
    write(action) {
        this.cancelWrite();
        const tokenSource = startCancelableOperation();
        this.previousTokenSource = tokenSource;
        return this.enqueue(this.writeQueue, action, tokenSource.token);
    }
    read(action) {
        return this.enqueue(this.readQueue, action);
    }
    enqueue(queue, action, cancellationToken = CancellationToken.None) {
        const deferred = new Deferred();
        const entry = {
            action,
            deferred,
            cancellationToken
        };
        queue.push(entry);
        this.performNextOperation();
        return deferred.promise;
    }
    async performNextOperation() {
        if (!this.done) {
            return;
        }
        const entries = [];
        if (this.writeQueue.length > 0) {
            // Just perform the next write action
            entries.push(this.writeQueue.shift());
        }
        else if (this.readQueue.length > 0) {
            // Empty the read queue and perform all actions in parallel
            entries.push(...this.readQueue.splice(0, this.readQueue.length));
        }
        else {
            return;
        }
        this.done = false;
        await Promise.all(entries.map(async ({ action, deferred, cancellationToken }) => {
            try {
                // Move the execution of the action to the next event loop tick via `Promise.resolve()`
                const result = await Promise.resolve().then(() => action(cancellationToken));
                deferred.resolve(result);
            }
            catch (err) {
                if (isOperationCancelled(err)) {
                    // If the operation was cancelled, we don't want to reject the promise
                    deferred.resolve(undefined);
                }
                else {
                    deferred.reject(err);
                }
            }
        }));
        this.done = true;
        this.performNextOperation();
    }
    cancelWrite() {
        this.previousTokenSource.cancel();
    }
}
//# sourceMappingURL=workspace-lock.js.map