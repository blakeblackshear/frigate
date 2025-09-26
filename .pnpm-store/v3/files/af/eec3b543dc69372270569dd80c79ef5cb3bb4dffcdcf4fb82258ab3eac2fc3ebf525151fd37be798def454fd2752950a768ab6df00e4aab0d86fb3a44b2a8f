import type { EntityState } from './models';
export declare function getInitialEntityState<V>(): EntityState<V>;
export declare function createInitialStateFactory<V>(): {
    getInitialState: {
        (): EntityState<V>;
        <S extends object>(additionalState: S): EntityState<V> & S;
    };
};
