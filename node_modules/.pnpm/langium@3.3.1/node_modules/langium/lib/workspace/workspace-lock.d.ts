/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CancellationToken } from '../utils/cancellation.js';
import { type MaybePromise } from '../utils/promise-utils.js';
/**
 * Utility service to execute mutually exclusive actions.
 */
export interface WorkspaceLock {
    /**
     * Performs a single async action, like initializing the workspace or processing document changes.
     * Only one action will be executed at a time.
     *
     * When another action is queued up, the token provided for the action will be cancelled.
     * Assuming the action makes use of this token, the next action only has to wait for the current action to finish cancellation.
     */
    write(action: (token: CancellationToken) => MaybePromise<void>): Promise<void>;
    /**
     * Performs a single action, like computing completion results or providing workspace symbols.
     * Read actions will only be executed after all write actions have finished. They will be executed in parallel if possible.
     *
     * If a write action is currently running, the read action will be queued up and executed afterwards.
     * If a new write action is queued up while a read action is waiting, the write action will receive priority and will be handled before the read action.
     *
     * Note that read actions are not allowed to modify anything in the workspace. Please use {@link write} instead.
     */
    read<T>(action: () => MaybePromise<T>): Promise<T>;
    /**
     * Cancels the last queued write action. All previous write actions already have been cancelled.
     */
    cancelWrite(): void;
}
export declare class DefaultWorkspaceLock implements WorkspaceLock {
    private previousTokenSource;
    private writeQueue;
    private readQueue;
    private done;
    write(action: (token: CancellationToken) => MaybePromise<void>): Promise<void>;
    read<T>(action: () => MaybePromise<T>): Promise<T>;
    private enqueue;
    private performNextOperation;
    cancelWrite(): void;
}
//# sourceMappingURL=workspace-lock.d.ts.map