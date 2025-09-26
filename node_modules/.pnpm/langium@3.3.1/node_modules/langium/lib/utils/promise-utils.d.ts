/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { CancellationToken, type AbstractCancellationTokenSource } from '../utils/cancellation.js';
export type MaybePromise<T> = T | Promise<T>;
/**
 * Delays the execution of the current code to the next tick of the event loop.
 * Don't call this method directly in a tight loop to prevent too many promises from being created.
 */
export declare function delayNextTick(): Promise<void>;
/**
 * Reset the global interruption period and create a cancellation token source.
 */
export declare function startCancelableOperation(): AbstractCancellationTokenSource;
/**
 * Change the period duration for `interruptAndCheck` to the given number of milliseconds.
 * The default value is 10ms.
 */
export declare function setInterruptionPeriod(period: number): void;
/**
 * This symbol may be thrown in an asynchronous context by any Langium service that receives
 * a `CancellationToken`. This means that the promise returned by such a service is rejected with
 * this symbol as rejection reason.
 */
export declare const OperationCancelled: unique symbol;
/**
 * Use this in a `catch` block to check whether the thrown object indicates that the operation
 * has been cancelled.
 */
export declare function isOperationCancelled(err: unknown): err is typeof OperationCancelled;
/**
 * This function does two things:
 *  1. Check the elapsed time since the last call to this function or to `startCancelableOperation`. If the predefined
 *     period (configured with `setInterruptionPeriod`) is exceeded, execution is delayed with `delayNextTick`.
 *  2. If the predefined period is not met yet or execution is resumed after an interruption, the given cancellation
 *     token is checked, and if cancellation is requested, `OperationCanceled` is thrown.
 *
 * All services in Langium that receive a `CancellationToken` may potentially call this function, so the
 * `CancellationToken` must be caught (with an `async` try-catch block or a `catch` callback attached to
 * the promise) to avoid that event being exposed as an error.
 */
export declare function interruptAndCheck(token: CancellationToken): Promise<void>;
/**
 * Simple implementation of the deferred pattern.
 * An object that exposes a promise and functions to resolve and reject it.
 */
export declare class Deferred<T = void> {
    resolve: (value: T) => this;
    reject: (err?: unknown) => this;
    promise: Promise<T>;
}
//# sourceMappingURL=promise-utils.d.ts.map