/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/* eslint-disable @typescript-eslint/no-explicit-any */

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
    [K in keyof T]: Module<I, T[K]> | ((injector: I) => T[K])
}

export namespace Module {
    export const merge = <M1, M2, R extends M1 & M2>(m1: Module<R, M1>, m2: Module<R, M2>) => (_merge(_merge({}, m1), m2) as Module<R, M1 & M2>);
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
export function inject<I1, I2, I3, I4, I5, I6, I7, I8, I9, I extends I1 & I2 & I3 & I4 & I5 & I6 & I7 & I8 & I9>(
    module1: Module<I, I1>, module2?: Module<I, I2>, module3?: Module<I, I3>, module4?: Module<I, I4>, module5?: Module<I, I5>, module6?: Module<I, I6>, module7?: Module<I, I7>, module8?: Module<I, I8>, module9?: Module<I, I9>
): I {
    const module = [module1, module2, module3, module4, module5, module6, module7, module8, module9].reduce(_merge, {}) as Module<I>;
    return _inject(module);
}

const isProxy = Symbol('isProxy');

/**
 * Eagerly load all services in the given dependency injection container. This is sometimes
 * necessary because services can register event listeners in their constructors.
 */
export function eagerLoad<T>(item: T): T {
    if (item && (item as any)[isProxy]) {
        for (const value of Object.values(item)) {
            eagerLoad(value);
        }
    }
    return item;
}

/**
 * Helper function that returns an injector by creating a proxy.
 * Invariant: injector is of type I. If injector is undefined, then T = I.
 */
function _inject<I, T>(module: Module<I, T>, injector?: any): T {
    const proxy: any = new Proxy({} as any, {
        deleteProperty: () => false,
        set: () => {
            throw new Error('Cannot set property on injected service container');
        },
        get: (obj, prop) => {
            if (prop === isProxy) {
                return true;
            } else {
                return _resolve(obj, prop, module, injector || proxy);
            }
        },
        getOwnPropertyDescriptor: (obj, prop) => (_resolve(obj, prop, module, injector || proxy), Object.getOwnPropertyDescriptor(obj, prop)), // used by for..in
        has: (_, prop) => prop in module, // used by ..in..
        ownKeys: () => [...Object.getOwnPropertyNames(module)] // used by for..in
    });
    return proxy;
}

/**
 * Internally used to tag a requested dependency, directly before calling the factory.
 * This allows us to find cycles during instance creation.
 */
const __requested__ = Symbol();

/**
 * Returns the value `obj[prop]`. If the value does not exist, yet, it is resolved from
 * the module description. The result of service factories is cached. Groups are
 * recursively proxied.
 *
 * @param obj an object holding all group proxies and services
 * @param prop the key of a value within obj
 * @param module an object containing groups and service factories
 * @param injector the first level proxy that provides access to all values
 * @returns the requested value `obj[prop]`
 * @throws Error if a dependency cycle is detected
 */
function _resolve<I, T>(obj: any, prop: string | symbol | number, module: Module<I, T>, injector: I): T[keyof T] | undefined {
    if (prop in obj) {
        if (obj[prop] instanceof Error) {
            throw new Error('Construction failure. Please make sure that your dependencies are constructable.', {cause: obj[prop]});
        }
        if (obj[prop] === __requested__) {
            throw new Error('Cycle detected. Please make "' + String(prop) + '" lazy. Visit https://langium.org/docs/reference/configuration-services/#resolving-cyclic-dependencies');
        }
        return obj[prop];
    } else if (prop in module) {
        const value: Module<I, T[keyof T]> | ((injector: I) => T[keyof T]) = module[prop as keyof T];
        obj[prop] = __requested__;
        try {
            obj[prop] = (typeof value === 'function') ? value(injector) : _inject(value, injector);
        } catch (error) {
            obj[prop] = error instanceof Error ? error : undefined;
            throw error;
        }
        return obj[prop];
    } else {
        return undefined;
    }
}

/**
 * Performs a deep-merge of two modules by writing source entries into the target module.
 *
 * @param target the module which is written
 * @param source the module which is read
 * @returns the target module
 */
function _merge(target: Module<any>, source?: Module<any>): Module<unknown> {
    if (source) {
        for (const [key, value2] of Object.entries(source)) {
            if (value2 !== undefined) {
                const value1 = target[key];
                if (value1 !== null && value2 !== null && typeof value1 === 'object' && typeof value2 === 'object') {
                    target[key] = _merge(value1, value2);
                } else {
                    target[key] = value2;
                }
            }
        }
    }
    return target;
}
