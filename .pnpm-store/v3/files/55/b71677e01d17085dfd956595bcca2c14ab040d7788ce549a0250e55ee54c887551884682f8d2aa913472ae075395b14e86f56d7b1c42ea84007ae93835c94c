/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import SiteStorage from '@generated/site-storage';
export type StorageType = (typeof SiteStorage)['type'] | 'none';
export type StorageSlot = {
    get: () => string | null;
    set: (value: string) => void;
    del: () => void;
    listen: (onChange: (event: StorageEvent) => void) => () => void;
};
/**
 * Creates an interface to work on a particular key in the storage model.
 * Note that this function only initializes the interface, but doesn't allocate
 * anything by itself (i.e. no side-effects).
 *
 * The API is fail-safe, since usage of browser storage should be considered
 * unreliable. Local storage might simply be unavailable (iframe + browser
 * security) or operations might fail individually. Please assume that using
 * this API can be a no-op. See also https://github.com/facebook/docusaurus/issues/6036
 */
export declare function createStorageSlot(keyInput: string, options?: {
    persistence?: StorageType;
}): StorageSlot;
export declare function useStorageSlot(key: string | null, options?: {
    persistence?: StorageType;
}): [string | null, StorageSlot];
/**
 * Returns a list of all the keys currently stored in browser storage,
 * or an empty list if browser storage can't be accessed.
 */
export declare function listStorageKeys(storageType?: StorageType): string[];
//# sourceMappingURL=storageUtils.d.ts.map