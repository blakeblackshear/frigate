/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { History, Location, Action } from 'history';
type HistoryBlockHandler = (location: Location, action: Action) => void | false;
/**
 * Permits to register a handler that will be called on history pop navigation
 * (backward/forward). If the handler returns `false`, the backward/forward
 * transition will be blocked. Unfortunately there's no good way to detect the
 * "direction" (backward/forward) of the POP event.
 */
export declare function useHistoryPopHandler(handler: HistoryBlockHandler): void;
/**
 * Permits to efficiently subscribe to a slice of the history
 * See https://thisweekinreact.com/articles/useSyncExternalStore-the-underrated-react-api
 * @param selector
 */
export declare function useHistorySelector<Value>(selector: (history: History<unknown>) => Value): Value;
/**
 * Permits to efficiently subscribe to a specific querystring value
 * @param key
 */
export declare function useQueryStringValue(key: string | null): string | null;
export declare function useQueryString(key: string): [string, (newValue: string | null, options?: {
    push: boolean;
}) => void];
type ListUpdate = string[] | ((oldValues: string[]) => string[]);
type ListUpdateFunction = (update: ListUpdate, options?: {
    push: boolean;
}) => void;
export declare function useQueryStringList(key: string): [string[], ListUpdateFunction];
export declare function useClearQueryString(): () => void;
export declare function mergeSearchParams(params: URLSearchParams[], strategy: 'append' | 'set'): URLSearchParams;
export declare function mergeSearchStrings(searchStrings: (string | undefined)[], strategy: 'append' | 'set'): string;
export {};
//# sourceMappingURL=historyUtils.d.ts.map