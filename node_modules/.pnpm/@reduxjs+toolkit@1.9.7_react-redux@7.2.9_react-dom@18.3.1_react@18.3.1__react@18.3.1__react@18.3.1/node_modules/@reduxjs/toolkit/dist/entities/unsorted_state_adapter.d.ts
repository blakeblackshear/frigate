import type { EntityStateAdapter, IdSelector } from './models';
export declare function createUnsortedStateAdapter<T>(selectId: IdSelector<T>): EntityStateAdapter<T>;
