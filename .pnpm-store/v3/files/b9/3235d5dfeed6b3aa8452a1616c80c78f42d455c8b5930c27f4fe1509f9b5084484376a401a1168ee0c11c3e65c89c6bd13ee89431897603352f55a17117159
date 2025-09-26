/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
/**
 * A `Module<I>` is a description of possibly grouped service factories.
 *
 * Given a type I = { group: { service: A } },
 * Module<I> := { group: { service: (injector: I) => A } }
 *
 * Making `I` available during the creation of `I` allows us to create cyclic
 * dependencies.
 */
export type Module<I, T = I> = {
    [K in keyof T]: Module<I, T[K]> | ((injector: I) => T[K]);
};
export declare namespace Module {
    const merge: <M1, M2, R extends M1 & M2>(m1: Module<R, M1>, m2: Module<R, M2>) => Module<R, M1 & M2>;
}
/**
 * Given a set of modules, the inject function returns a lazily evaluated injector
 * that injects dependencies into the requested service when it is requested the
 * first time. Subsequent requests will return the same service.
 *
 * In the case of cyclic dependencies, an Error will be thrown. This can be fixed
 * by injecting a provider `() => T` instead of a `T`.
 *
 * Please note that the arguments may be objects or arrays. However, the result will
 * be an object. Using it with for..of will have no effect.
 *
 * @param module1 first Module
 * @param module2 (optional) second Module
 * @param module3 (optional) third Module
 * @param module4 (optional) fourth Module
 * @param module5 (optional) fifth Module
 * @param module6 (optional) sixth Module
 * @param module7 (optional) seventh Module
 * @param module8 (optional) eighth Module
 * @param module9 (optional) ninth Module
 * @returns a new object of type I
 */
export declare function inject<I1, I2, I3, I4, I5, I6, I7, I8, I9, I extends I1 & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9>(module1: Module<I, I1>, module2?: Module<I, I2>, module3?: Module<I, I3>, module4?: Module<I, I4>, module5?: Module<I, I5>, module6?: Module<I, I6>, module7?: Module<I, I7>, module8?: Module<I, I8>, module9?: Module<I, I9>): I;
/**
 * Eagerly load all services in the given dependency injection container. This is sometimes
 * necessary because services can register event listeners in their constructors.
 */
export declare function eagerLoad<T>(item: T): T;
//# sourceMappingURL=dependency-injection.d.ts.map