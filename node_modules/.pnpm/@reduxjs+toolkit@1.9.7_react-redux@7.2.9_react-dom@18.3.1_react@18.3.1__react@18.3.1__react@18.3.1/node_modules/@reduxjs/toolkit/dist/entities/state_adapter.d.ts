import type { EntityState, PreventAny } from './models';
import type { PayloadAction } from '../createAction';
import { IsAny } from '../tsHelpers';
export declare function createSingleArgumentStateOperator<V>(mutator: (state: EntityState<V>) => void): <S extends EntityState<V>>(state: IsAny<S, EntityState<V>, S>) => S;
export declare function createStateOperator<V, R>(mutator: (arg: R, state: EntityState<V>) => void): <S extends EntityState<V>>(state: S, arg: R | PayloadAction<R>) => S;
