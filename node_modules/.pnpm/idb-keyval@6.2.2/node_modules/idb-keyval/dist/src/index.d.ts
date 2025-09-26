export declare function promisifyRequest<T = undefined>(request: IDBRequest<T> | IDBTransaction): Promise<T>;
export declare function createStore(dbName: string, storeName: string): UseStore;
export type UseStore = <T>(txMode: IDBTransactionMode, callback: (store: IDBObjectStore) => T | PromiseLike<T>) => Promise<T>;
/**
 * Get a value by its key.
 *
 * @param key
 * @param customStore Method to get a custom store. Use with caution (see the docs).
 */
export declare function get<T = any>(key: IDBValidKey, customStore?: UseStore): Promise<T | undefined>;
/**
 * Set a value with a key.
 *
 * @param key
 * @param value
 * @param customStore Method to get a custom store. Use with caution (see the docs).
 */
export declare function set(key: IDBValidKey, value: any, customStore?: UseStore): Promise<void>;
/**
 * Set multiple values at once. This is faster than calling set() multiple times.
 * It's also atomic – if one of the pairs can't be added, none will be added.
 *
 * @param entries Array of entries, where each entry is an array of `[key, value]`.
 * @param customStore Method to get a custom store. Use with caution (see the docs).
 */
export declare function setMany(entries: [IDBValidKey, any][], customStore?: UseStore): Promise<void>;
/**
 * Get multiple values by their keys
 *
 * @param keys
 * @param customStore Method to get a custom store. Use with caution (see the docs).
 */
export declare function getMany<T = any>(keys: IDBValidKey[], customStore?: UseStore): Promise<T[]>;
/**
 * Update a value. This lets you see the old value and update it as an atomic operation.
 *
 * @param key
 * @param updater A callback that takes the old value and returns a new value.
 * @param customStore Method to get a custom store. Use with caution (see the docs).
 */
export declare function update<T = any>(key: IDBValidKey, updater: (oldValue: T | undefined) => T, customStore?: UseStore): Promise<void>;
/**
 * Delete a particular key from the store.
 *
 * @param key
 * @param customStore Method to get a custom store. Use with caution (see the docs).
 */
export declare function del(key: IDBValidKey, customStore?: UseStore): Promise<void>;
/**
 * Delete multiple keys at once.
 *
 * @param keys List of keys to delete.
 * @param customStore Method to get a custom store. Use with caution (see the docs).
 */
export declare function delMany(keys: IDBValidKey[], customStore?: UseStore): Promise<void>;
/**
 * Clear all values in the store.
 *
 * @param customStore Method to get a custom store. Use with caution (see the docs).
 */
export declare function clear(customStore?: UseStore): Promise<void>;
/**
 * Get all keys in the store.
 *
 * @param customStore Method to get a custom store. Use with caution (see the docs).
 */
export declare function keys<KeyType extends IDBValidKey>(customStore?: UseStore): Promise<KeyType[]>;
/**
 * Get all values in the store.
 *
 * @param customStore Method to get a custom store. Use with caution (see the docs).
 */
export declare function values<T = any>(customStore?: UseStore): Promise<T[]>;
/**
 * Get all entries in the store. Each entry is an array of `[key, value]`.
 *
 * @param customStore Method to get a custom store. Use with caution (see the docs).
 */
export declare function entries<KeyType extends IDBValidKey, ValueType = any>(customStore?: UseStore): Promise<[KeyType, ValueType][]>;
