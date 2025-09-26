import react, { FC, PropsWithChildren } from 'react';
import { SWRConfiguration, Cache, ProviderConfiguration, ScopedMutator, FullConfiguration, GlobalState, State, Arguments, MutatorCallback, MutatorOptions, Key, Fetcher, SWRHook, Middleware, BareFetcher, FetcherResponse } from './types.js';
export * from './types.js';
import * as events_d_ts from './events.js';
export { events_d_ts as revalidateEvents };
export { INFINITE_PREFIX } from './constants.js';
import { dequal } from 'dequal/lite';

declare const SWRConfig: FC<PropsWithChildren<{
    value?: SWRConfiguration | ((parentConfig?: SWRConfiguration) => SWRConfiguration);
}>>;

declare const initCache: <Data = any>(provider: Cache<Data>, options?: Partial<ProviderConfiguration>) => [Cache<Data>, ScopedMutator, () => void, () => void] | [Cache<Data>, ScopedMutator] | undefined;

declare const compare: typeof dequal;
declare const cache: Cache<any>;
declare const mutate: ScopedMutator;

declare const defaultConfig: FullConfiguration;

declare const IS_REACT_LEGACY = false;
declare const IS_SERVER: boolean;
declare const rAF: (f: (...args: any[]) => void) => number | ReturnType<typeof setTimeout>;
declare const useIsomorphicLayoutEffect: typeof react.useEffect;
declare const slowConnection: boolean | undefined;

declare const SWRGlobalState: WeakMap<Cache<any>, GlobalState>;

declare const stableHash: (arg: any) => string;

declare const isWindowDefined: boolean;
declare const isDocumentDefined: boolean;
declare const isLegacyDeno: boolean;
declare const hasRequestAnimationFrame: () => boolean;
declare const createCacheHelper: <Data = any, T = State<Data, any>>(cache: Cache, key: string | undefined) => readonly [() => T, (info: T) => void, (key: string, callback: (current: any, prev: any) => void) => () => void, () => any];

declare const noop: () => void;
declare const UNDEFINED: undefined;
declare const OBJECT: ObjectConstructor;
declare const isUndefined: (v: any) => v is undefined;
declare const isFunction: <T extends (...args: any[]) => any = (...args: any[]) => any>(v: unknown) => v is T;
declare const mergeObjects: (a: any, b?: any) => any;
declare const isPromiseLike: (x: unknown) => x is PromiseLike<unknown>;

declare const mergeConfigs: (a: Partial<FullConfiguration>, b?: Partial<FullConfiguration>) => Partial<FullConfiguration>;

type KeyFilter = (key?: Arguments) => boolean;
declare function internalMutate<Data>(cache: Cache, _key: KeyFilter, _data?: Data | Promise<Data | undefined> | MutatorCallback<Data>, _opts?: boolean | MutatorOptions<Data>): Promise<Array<Data | undefined>>;
declare function internalMutate<Data>(cache: Cache, _key: Arguments, _data?: Data | Promise<Data | undefined> | MutatorCallback<Data>, _opts?: boolean | MutatorOptions<Data>): Promise<Data | undefined>;

declare const normalize: <KeyType_1 = Key, Data = any>(args: [KeyType_1] | [KeyType_1, Fetcher<Data> | null] | [KeyType_1, SWRConfiguration | undefined] | [KeyType_1, Fetcher<Data> | null, SWRConfiguration | undefined]) => [KeyType_1, Fetcher<Data> | null, Partial<SWRConfiguration<Data>>];

declare const withArgs: <SWRType>(hook: any) => SWRType;

declare const serialize: (key: Key) => [string, Arguments];

type Callback = (...args: any[]) => any;
declare const subscribeCallback: (key: string, callbacks: Record<string, Callback[]>, callback: Callback) => () => void;

declare const getTimestamp: () => number;

declare const useSWRConfig: () => FullConfiguration;

declare const preset: {
    readonly isOnline: () => boolean;
    readonly isVisible: () => boolean;
};
declare const defaultConfigOptions: ProviderConfiguration;

declare const withMiddleware: (useSWR: SWRHook, middleware: Middleware) => SWRHook;

type PreloadFetcher<Data = unknown, SWRKey extends Key = Key> = SWRKey extends () => infer Arg ? (arg: Arg) => FetcherResponse<Data> : SWRKey extends infer Arg ? (arg: Arg) => FetcherResponse<Data> : never;
declare const preload: <Data = any, SWRKey extends Key = Key, Fetcher extends BareFetcher = PreloadFetcher<Data, SWRKey>>(key_: SWRKey, fetcher: Fetcher) => ReturnType<Fetcher>;

export { IS_REACT_LEGACY, IS_SERVER, OBJECT, SWRConfig, SWRGlobalState, UNDEFINED, cache, compare, createCacheHelper, defaultConfig, defaultConfigOptions, getTimestamp, hasRequestAnimationFrame, initCache, internalMutate, isDocumentDefined, isFunction, isLegacyDeno, isPromiseLike, isUndefined, isWindowDefined, mergeConfigs, mergeObjects, mutate, noop, normalize, preload, preset, rAF, serialize, slowConnection, stableHash, subscribeCallback, useIsomorphicLayoutEffect, useSWRConfig, withArgs, withMiddleware };
