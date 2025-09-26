import type { Middleware, StoreEnhancer } from 'redux';
export declare function getTimeMeasureUtils(maxDelay: number, fnName: string): {
    measureTime<T>(fn: () => T): T;
    warnIfExceeded(): void;
};
export declare function delay(ms: number): Promise<unknown>;
/**
 * @public
 */
export declare class MiddlewareArray<Middlewares extends Middleware<any, any>[]> extends Array<Middlewares[number]> {
    constructor(...items: Middlewares);
    static get [Symbol.species](): any;
    concat<AdditionalMiddlewares extends ReadonlyArray<Middleware<any, any>>>(items: AdditionalMiddlewares): MiddlewareArray<[...Middlewares, ...AdditionalMiddlewares]>;
    concat<AdditionalMiddlewares extends ReadonlyArray<Middleware<any, any>>>(...items: AdditionalMiddlewares): MiddlewareArray<[...Middlewares, ...AdditionalMiddlewares]>;
    prepend<AdditionalMiddlewares extends ReadonlyArray<Middleware<any, any>>>(items: AdditionalMiddlewares): MiddlewareArray<[...AdditionalMiddlewares, ...Middlewares]>;
    prepend<AdditionalMiddlewares extends ReadonlyArray<Middleware<any, any>>>(...items: AdditionalMiddlewares): MiddlewareArray<[...AdditionalMiddlewares, ...Middlewares]>;
}
/**
 * @public
 */
export declare class EnhancerArray<Enhancers extends StoreEnhancer<any, any>[]> extends Array<Enhancers[number]> {
    constructor(...items: Enhancers);
    static get [Symbol.species](): any;
    concat<AdditionalEnhancers extends ReadonlyArray<StoreEnhancer<any, any>>>(items: AdditionalEnhancers): EnhancerArray<[...Enhancers, ...AdditionalEnhancers]>;
    concat<AdditionalEnhancers extends ReadonlyArray<StoreEnhancer<any, any>>>(...items: AdditionalEnhancers): EnhancerArray<[...Enhancers, ...AdditionalEnhancers]>;
    prepend<AdditionalEnhancers extends ReadonlyArray<StoreEnhancer<any, any>>>(items: AdditionalEnhancers): EnhancerArray<[...AdditionalEnhancers, ...Enhancers]>;
    prepend<AdditionalEnhancers extends ReadonlyArray<StoreEnhancer<any, any>>>(...items: AdditionalEnhancers): EnhancerArray<[...AdditionalEnhancers, ...Enhancers]>;
}
export declare function freezeDraftable<T>(val: T): T;
