import type { CrawlHook, SyncCrawlHook, CrawlParams } from "./types";
export declare const crawl: <T extends {}, R extends {} = {}>(data: any, hooks: CrawlHook<T, R> | SyncCrawlHook<T, R> | CrawlHook<T, R>[] | SyncCrawlHook<T, R>[], params?: CrawlParams<T, R>) => Promise<void>;
export declare const syncCrawl: <T extends {}, R extends {} = {}>(data: any, hooks: SyncCrawlHook<T, R> | SyncCrawlHook<T, R>[], params?: CrawlParams<T, R>) => void;
