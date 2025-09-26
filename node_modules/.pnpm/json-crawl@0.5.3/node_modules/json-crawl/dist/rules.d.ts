import type { CrawlRules, JsonPath } from "./types";
export declare const getNodeRules: <R extends {} = {}>(rules: CrawlRules<R> | undefined, key: string | number, path: JsonPath, value: unknown) => CrawlRules<R> | undefined;
export declare const mergeRules: <T extends {}, R extends {} = {}>(rules: CrawlRules<R>[]) => CrawlRules<R>;
