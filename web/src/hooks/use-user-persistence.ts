import { useEffect, useState, useCallback, useContext, useRef } from "react";
import { get as getData, set as setData, del as delData } from "idb-keyval";
import { AuthContext } from "@/context/auth-context";

type useUserPersistenceReturn<S> = [
  value: S | undefined,
  setValue: (value: S | undefined) => void,
  loaded: boolean,
  deleteValue: () => void,
];

// Key used to track which keys have been migrated to prevent re-reading old keys
const MIGRATED_KEYS_STORAGE_KEY = "frigate-migrated-user-keys";

/**
 * Compute the user-namespaced key for a given base key and username.
 */
export function getUserNamespacedKey(
  key: string,
  username: string | undefined,
): string {
  const isAuthenticated = username && username !== "anonymous";
  return isAuthenticated ? `${key}:${username}` : key;
}

/**
 * Delete a user-namespaced key from storage.
 * This is useful for clearing user-specific data from settings pages.
 */
export async function deleteUserNamespacedKey(
  key: string,
  username: string | undefined,
): Promise<void> {
  const namespacedKey = getUserNamespacedKey(key, username);
  await delData(namespacedKey);
}

/**
 * Get the set of keys that have already been migrated for a specific user.
 */
async function getMigratedKeys(username: string): Promise<Set<string>> {
  const allMigrated =
    (await getData<Record<string, string[]>>(MIGRATED_KEYS_STORAGE_KEY)) || {};
  return new Set(allMigrated[username] || []);
}

/**
 * Mark a key as migrated for a specific user.
 */
async function markKeyAsMigrated(username: string, key: string): Promise<void> {
  const allMigrated =
    (await getData<Record<string, string[]>>(MIGRATED_KEYS_STORAGE_KEY)) || {};
  const userMigrated = new Set(allMigrated[username] || []);
  userMigrated.add(key);
  allMigrated[username] = Array.from(userMigrated);
  await setData(MIGRATED_KEYS_STORAGE_KEY, allMigrated);
}

/**
 * Hook for user-namespaced persistence with automatic migration from legacy keys.
 *
 * This hook:
 * 1. Namespaces storage keys by username to isolate per-user preferences
 * 2. Automatically migrates data from legacy (non-namespaced) keys on first use
 * 3. Tracks migrated keys to prevent re-reading stale data after migration
 * 4. Waits for auth to load before returning values to prevent race conditions
 *
 * @param key - The base key name (will be namespaced with username)
 * @param defaultValue - Default value if no persisted value exists
 */
export function useUserPersistence<S>(
  key: string,
  defaultValue: S | undefined = undefined,
): useUserPersistenceReturn<S> {
  const { auth } = useContext(AuthContext);
  const [value, setInternalValue] = useState<S | undefined>(defaultValue);
  const [loaded, setLoaded] = useState<boolean>(false);
  const migrationAttemptedRef = useRef(false);

  // Compute the user-namespaced key
  const username = auth?.user?.username;
  const isAuthenticated =
    username && username !== "anonymous" && !auth.isLoading;
  const namespacedKey = isAuthenticated ? `${key}:${username}` : key;

  // Track the key that was used when loading to prevent cross-key writes
  const loadedKeyRef = useRef<string | null>(null);

  const setValue = useCallback(
    (newValue: S | undefined) => {
      // Only allow writes if we've loaded for this key
      // This prevents stale callbacks from writing to the wrong key
      if (loadedKeyRef.current !== namespacedKey) {
        return;
      }
      setInternalValue(newValue);
      async function update() {
        await setData(namespacedKey, newValue);
      }
      update();
    },
    [namespacedKey],
  );

  const deleteValue = useCallback(async () => {
    if (loadedKeyRef.current !== namespacedKey) {
      return;
    }
    await delData(namespacedKey);
    setInternalValue(defaultValue);
  }, [namespacedKey, defaultValue]);

  useEffect(() => {
    // Don't load until auth is resolved
    if (auth.isLoading) {
      return;
    }

    // Reset state when key changes - this prevents stale writes
    loadedKeyRef.current = null;
    migrationAttemptedRef.current = false;
    setLoaded(false);

    async function loadWithMigration() {
      // For authenticated users, check if we need to migrate from legacy key
      if (isAuthenticated && username && !migrationAttemptedRef.current) {
        migrationAttemptedRef.current = true;

        const migratedKeys = await getMigratedKeys(username);

        // Check if we already have data in the namespaced key
        const existingNamespacedValue = await getData<S>(namespacedKey);

        if (typeof existingNamespacedValue !== "undefined") {
          // Already have namespaced data, use it
          setInternalValue(existingNamespacedValue);
          loadedKeyRef.current = namespacedKey;
          setLoaded(true);
          return;
        }

        // Check if this key has already been migrated (even if value was deleted)
        if (migratedKeys.has(key)) {
          // Already migrated, don't read from legacy key
          setInternalValue(defaultValue);
          loadedKeyRef.current = namespacedKey;
          setLoaded(true);
          return;
        }

        // Try to migrate from legacy key
        const legacyValue = await getData<S>(key);
        if (typeof legacyValue !== "undefined") {
          // Migrate: copy to namespaced key, delete legacy key, mark as migrated
          await setData(namespacedKey, legacyValue);
          await delData(key);
          await markKeyAsMigrated(username, key);
          setInternalValue(legacyValue);
          loadedKeyRef.current = namespacedKey;
          setLoaded(true);
          return;
        }

        // No legacy value, just mark as migrated so we don't check again
        await markKeyAsMigrated(username, key);
        setInternalValue(defaultValue);
        loadedKeyRef.current = namespacedKey;
        setLoaded(true);
        return;
      }

      // For unauthenticated users or after migration check, just load normally
      const storedValue = await getData<S>(namespacedKey);
      if (typeof storedValue !== "undefined") {
        setInternalValue(storedValue);
      } else {
        setInternalValue(defaultValue);
      }
      loadedKeyRef.current = namespacedKey;
      setLoaded(true);
    }

    loadWithMigration();
  }, [
    auth.isLoading,
    isAuthenticated,
    username,
    key,
    namespacedKey,
    defaultValue,
  ]);

  // Don't return a value until auth has finished loading
  if (auth.isLoading) {
    return [undefined, setValue, false, deleteValue];
  }

  return [value, setValue, loaded, deleteValue];
}
