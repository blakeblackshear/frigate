/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useContext, useEffect, useMemo, useState, useCallback, } from 'react';
import { useAllDocsData, useDocsData, } from '@docusaurus/plugin-content-docs/client';
import { DEFAULT_PLUGIN_ID } from '@docusaurus/constants';
import { useThemeConfig } from '@docusaurus/theme-common';
import { ReactContextError, createStorageSlot, } from '@docusaurus/theme-common/internal';
const storageKey = (pluginId) => `docs-preferred-version-${pluginId}`;
const DocsPreferredVersionStorage = {
    save: (pluginId, persistence, versionName) => {
        createStorageSlot(storageKey(pluginId), { persistence }).set(versionName);
    },
    read: (pluginId, persistence) => createStorageSlot(storageKey(pluginId), { persistence }).get(),
    clear: (pluginId, persistence) => {
        createStorageSlot(storageKey(pluginId), { persistence }).del();
    },
};
/**
 * Initial state is always null as we can't read local storage from node SSR
 */
const getInitialState = (pluginIds) => Object.fromEntries(pluginIds.map((id) => [id, { preferredVersionName: null }]));
/**
 * Read storage for all docs plugins, assigning each doc plugin a preferred
 * version (if found)
 */
function readStorageState({ pluginIds, versionPersistence, allDocsData, }) {
    /**
     * The storage value we read might be stale, and belong to a version that does
     * not exist in the site anymore. In such case, we remove the storage value to
     * avoid downstream errors.
     */
    function restorePluginState(pluginId) {
        const preferredVersionNameUnsafe = DocsPreferredVersionStorage.read(pluginId, versionPersistence);
        const pluginData = allDocsData[pluginId];
        const versionExists = pluginData.versions.some((version) => version.name === preferredVersionNameUnsafe);
        if (versionExists) {
            return { preferredVersionName: preferredVersionNameUnsafe };
        }
        DocsPreferredVersionStorage.clear(pluginId, versionPersistence);
        return { preferredVersionName: null };
    }
    return Object.fromEntries(pluginIds.map((id) => [id, restorePluginState(id)]));
}
function useVersionPersistence() {
    return useThemeConfig().docs.versionPersistence;
}
const Context = React.createContext(null);
function useContextValue() {
    const allDocsData = useAllDocsData();
    const versionPersistence = useVersionPersistence();
    const pluginIds = useMemo(() => Object.keys(allDocsData), [allDocsData]);
    // Initial state is empty, as we can't read browser storage in node/SSR
    const [state, setState] = useState(() => getInitialState(pluginIds));
    // On mount, we set the state read from browser storage
    useEffect(() => {
        setState(readStorageState({ allDocsData, versionPersistence, pluginIds }));
    }, [allDocsData, versionPersistence, pluginIds]);
    // The API that we expose to consumer hooks (memo for constant object)
    const api = useMemo(() => {
        function savePreferredVersion(pluginId, versionName) {
            DocsPreferredVersionStorage.save(pluginId, versionPersistence, versionName);
            setState((s) => ({
                ...s,
                [pluginId]: { preferredVersionName: versionName },
            }));
        }
        return {
            savePreferredVersion,
        };
    }, [versionPersistence]);
    return [state, api];
}
function DocsPreferredVersionContextProviderUnsafe({ children, }) {
    const value = useContextValue();
    return <Context.Provider value={value}>{children}</Context.Provider>;
}
/**
 * This is a maybe-layer. If the docs plugin is not enabled, this provider is a
 * simple pass-through.
 */
export function DocsPreferredVersionContextProvider({ children, }) {
    return (<DocsPreferredVersionContextProviderUnsafe>
      {children}
    </DocsPreferredVersionContextProviderUnsafe>);
}
function useDocsPreferredVersionContext() {
    const value = useContext(Context);
    if (!value) {
        throw new ReactContextError('DocsPreferredVersionContextProvider');
    }
    return value;
}
/**
 * Returns a read-write interface to a plugin's preferred version. The
 * "preferred version" is defined as the last version that the user visited.
 * For example, if a user is using v3, even when v4 is later published, the user
 * would still be browsing v3 docs when she opens the website next time. Note,
 * the `preferredVersion` attribute will always be `null` before mount.
 */
export function useDocsPreferredVersion(pluginId = DEFAULT_PLUGIN_ID) {
    const docsData = useDocsData(pluginId);
    const [state, api] = useDocsPreferredVersionContext();
    const { preferredVersionName } = state[pluginId];
    const preferredVersion = docsData.versions.find((version) => version.name === preferredVersionName) ?? null;
    const savePreferredVersionName = useCallback((versionName) => {
        api.savePreferredVersion(pluginId, versionName);
    }, [api, pluginId]);
    return { preferredVersion, savePreferredVersionName };
}
export function useDocsPreferredVersionByPluginId() {
    const allDocsData = useAllDocsData();
    const [state] = useDocsPreferredVersionContext();
    function getPluginIdPreferredVersion(pluginId) {
        const docsData = allDocsData[pluginId];
        const { preferredVersionName } = state[pluginId];
        return (docsData.versions.find((version) => version.name === preferredVersionName) ?? null);
    }
    const pluginIds = Object.keys(allDocsData);
    return Object.fromEntries(pluginIds.map((id) => [id, getPluginIdPreferredVersion(id)]));
}
