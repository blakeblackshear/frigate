import type { SerializedError } from '@reduxjs/toolkit';
export declare const taskCancelled: "task-cancelled";
export declare const taskCompleted: "task-completed";
export declare const listenerCancelled: "listener-cancelled";
export declare const listenerCompleted: "listener-completed";
export declare class TaskAbortError implements SerializedError {
    code: string | undefined;
    name: string;
    message: string;
    constructor(code: string | undefined);
}
