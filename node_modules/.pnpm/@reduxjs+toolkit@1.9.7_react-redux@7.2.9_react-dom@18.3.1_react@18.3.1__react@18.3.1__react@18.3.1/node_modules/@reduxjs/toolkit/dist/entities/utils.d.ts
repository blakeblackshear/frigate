import type { EntityState, IdSelector, Update, EntityId } from './models';
export declare function selectIdValue<T>(entity: T, selectId: IdSelector<T>): EntityId;
export declare function ensureEntitiesArray<T>(entities: readonly T[] | Record<EntityId, T>): readonly T[];
export declare function splitAddedUpdatedEntities<T>(newEntities: readonly T[] | Record<EntityId, T>, selectId: IdSelector<T>, state: EntityState<T>): [T[], Update<T>[]];
