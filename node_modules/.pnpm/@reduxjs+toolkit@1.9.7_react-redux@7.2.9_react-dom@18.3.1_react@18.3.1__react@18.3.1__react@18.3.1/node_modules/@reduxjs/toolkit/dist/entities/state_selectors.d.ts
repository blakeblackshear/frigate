import type { EntityState, EntitySelectors } from './models';
export declare function createSelectorsFactory<T>(): {
    getSelectors: {
        (): EntitySelectors<T, EntityState<T>>;
        <V>(selectState: (state: V) => EntityState<T>): EntitySelectors<T, V>;
    };
};
