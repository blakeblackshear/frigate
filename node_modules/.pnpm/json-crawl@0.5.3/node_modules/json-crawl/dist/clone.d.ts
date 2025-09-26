import type { CloneHook, CrawlParams, SyncCloneHook } from "./types";
export declare const clone: <T extends {}, R extends {} = {}>(data: unknown, hooks?: CloneHook<T, R> | SyncCloneHook<T, R> | CloneHook<T, R>[] | SyncCloneHook<T, R>[], params?: CrawlParams<T, R>) => Promise<unknown>;
export declare const syncClone: <T extends {}, R extends {} = {}>(data: unknown, hooks?: SyncCloneHook<T, R> | SyncCloneHook<T, R>[], params?: CrawlParams<T, R>) => unknown;
