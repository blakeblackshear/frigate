import type { Middleware, StoreEnhancer } from 'redux';
import type { EnhancerArray, MiddlewareArray } from './utils';
/**
 * return True if T is `any`, otherwise return False
 * taken from https://github.com/joonhocho/tsdef
 *
 * @internal
 */
export declare type IsAny<T, True, False = never> = true | false extends (T extends never ? true : false) ? True : False;
/**
 * return True if T is `unknown`, otherwise return False
 * taken from https://github.com/joonhocho/tsdef
 *
 * @internal
 */
export declare type IsUnknown<T, True, False = never> = unknown extends T ? IsAny<T, False, True> : False;
export declare type FallbackIfUnknown<T, Fallback> = IsUnknown<T, Fallback, T>;
/**
 * @internal
 */
export declare type IfMaybeUndefined<P, True, False> = [undefined] extends [P] ? True : False;
/**
 * @internal
 */
export declare type IfVoid<P, True, False> = [void] extends [P] ? True : False;
/**
 * @internal
 */
export declare type IsEmptyObj<T, True, False = never> = T extends any ? keyof T extends never ? IsUnknown<T, False, IfMaybeUndefined<T, False, IfVoid<T, False, True>>> : False : never;
/**
 * returns True if TS version is above 3.5, False if below.
 * uses feature detection to detect TS version >= 3.5
 * * versions below 3.5 will return `{}` for unresolvable interference
 * * versions above will return `unknown`
 *
 * @internal
 */
export declare type AtLeastTS35<True, False> = [True, False][IsUnknown<ReturnType<(<T>() => T)>, 0, 1>];
/**
 * @internal
 */
export declare type IsUnknownOrNonInferrable<T, True, False> = AtLeastTS35<IsUnknown<T, True, False>, IsEmptyObj<T, True, IsUnknown<T, True, False>>>;
/**
 * Convert a Union type `(A|B)` to an intersection type `(A&B)`
 */
export declare type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
export declare type ExcludeFromTuple<T, E, Acc extends unknown[] = []> = T extends [
    infer Head,
    ...infer Tail
] ? ExcludeFromTuple<Tail, E, [...Acc, ...([Head] extends [E] ? [] : [Head])]> : Acc;
declare type ExtractDispatchFromMiddlewareTuple<MiddlewareTuple extends any[], Acc extends {}> = MiddlewareTuple extends [infer Head, ...infer Tail] ? ExtractDispatchFromMiddlewareTuple<Tail, Acc & (Head extends Middleware<infer D> ? IsAny<D, {}, D> : {})> : Acc;
export declare type ExtractDispatchExtensions<M> = M extends MiddlewareArray<infer MiddlewareTuple> ? ExtractDispatchFromMiddlewareTuple<MiddlewareTuple, {}> : M extends ReadonlyArray<Middleware> ? ExtractDispatchFromMiddlewareTuple<[...M], {}> : never;
declare type ExtractStoreExtensionsFromEnhancerTuple<EnhancerTuple extends any[], Acc extends {}> = EnhancerTuple extends [infer Head, ...infer Tail] ? ExtractStoreExtensionsFromEnhancerTuple<Tail, Acc & (Head extends StoreEnhancer<infer Ext> ? IsAny<Ext, {}, Ext> : {})> : Acc;
export declare type ExtractStoreExtensions<E> = E extends EnhancerArray<infer EnhancerTuple> ? ExtractStoreExtensionsFromEnhancerTuple<EnhancerTuple, {}> : E extends ReadonlyArray<StoreEnhancer> ? UnionToIntersection<E[number] extends StoreEnhancer<infer Ext> ? Ext extends {} ? IsAny<Ext, {}, Ext> : {} : {}> : never;
declare type ExtractStateExtensionsFromEnhancerTuple<EnhancerTuple extends any[], Acc extends {}> = EnhancerTuple extends [infer Head, ...infer Tail] ? ExtractStateExtensionsFromEnhancerTuple<Tail, Acc & (Head extends StoreEnhancer<any, infer StateExt> ? IsAny<StateExt, {}, StateExt> : {})> : Acc;
export declare type ExtractStateExtensions<E> = E extends EnhancerArray<infer EnhancerTuple> ? ExtractStateExtensionsFromEnhancerTuple<EnhancerTuple, {}> : E extends ReadonlyArray<StoreEnhancer> ? UnionToIntersection<E[number] extends StoreEnhancer<any, infer StateExt> ? StateExt extends {} ? IsAny<StateExt, {}, StateExt> : {} : {}> : never;
/**
 * Helper type. Passes T out again, but boxes it in a way that it cannot
 * "widen" the type by accident if it is a generic that should be inferred
 * from elsewhere.
 *
 * @internal
 */
export declare type NoInfer<T> = [T][T extends any ? 0 : never];
export declare type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
export interface TypeGuard<T> {
    (value: any): value is T;
}
export interface HasMatchFunction<T> {
    match: TypeGuard<T>;
}
export declare const hasMatchFunction: <T>(v: Matcher<T>) => v is HasMatchFunction<T>;
/** @public */
export declare type Matcher<T> = HasMatchFunction<T> | TypeGuard<T>;
/** @public */
export declare type ActionFromMatcher<M extends Matcher<any>> = M extends Matcher<infer T> ? T : never;
export declare type Id<T> = {
    [K in keyof T]: T[K];
} & {};
export {};
