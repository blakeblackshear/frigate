/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { useLocation } from '@docusaurus/router';
import { useAllPluginInstancesData, usePluginData, } from '@docusaurus/useGlobalData';
import { getActivePlugin, getLatestVersion, getActiveVersion, getActiveDocContext, getDocVersionSuggestions, } from './docsClientUtils';
export { useDocById, findSidebarCategory, findFirstSidebarItemLink, isActiveSidebarItem, isVisibleSidebarItem, useVisibleSidebarItems, useSidebarBreadcrumbs, useDocsVersionCandidates, useLayoutDoc, useLayoutDocsSidebar, useDocRootMetadata, useCurrentSidebarCategory, useCurrentSidebarSiblings, filterDocCardListItems, } from './docsUtils';
export { useDocsPreferredVersion } from './docsPreferredVersion';
export { DocSidebarItemsExpandedStateProvider, useDocSidebarItemsExpandedState, } from './docSidebarItemsExpandedState';
export { DocsVersionProvider, useDocsVersion } from './docsVersion';
export { DocsSidebarProvider, useDocsSidebar } from './docsSidebar';
export { DocProvider, useDoc } from './doc';
export { useDocsPreferredVersionByPluginId, DocsPreferredVersionContextProvider, } from './docsPreferredVersion';
export { useDocsContextualSearchTags, getDocsVersionSearchTag, } from './docsSearch';
export { useBreadcrumbsStructuredData } from './structuredDataUtils';
// Important to use a constant object to avoid React useEffect executions etc.
// see https://github.com/facebook/docusaurus/issues/5089
const StableEmptyObject = {};
// In blog-only mode, docs hooks are still used by the theme. We need a fail-
// safe fallback when the docs plugin is not in use
export const useAllDocsData = () => useAllPluginInstancesData('docusaurus-plugin-content-docs') ?? StableEmptyObject;
export const useDocsData = (pluginId) => {
    try {
        return usePluginData('docusaurus-plugin-content-docs', pluginId, {
            failfast: true,
        });
    }
    catch (error) {
        throw new Error(`You are using a feature of the Docusaurus docs plugin, but this plugin does not seem to be enabled${pluginId === 'Default' ? '' : ` (pluginId=${pluginId}`}`, { cause: error });
    }
};
// TODO this feature should be provided by docusaurus core
export function useActivePlugin(options = {}) {
    const data = useAllDocsData();
    const { pathname } = useLocation();
    return getActivePlugin(data, pathname, options);
}
export function useActivePluginAndVersion(options = {}) {
    const activePlugin = useActivePlugin(options);
    const { pathname } = useLocation();
    if (!activePlugin) {
        return undefined;
    }
    const activeVersion = getActiveVersion(activePlugin.pluginData, pathname);
    return {
        activePlugin,
        activeVersion,
    };
}
/** Versions are returned ordered (most recent first). */
export function useVersions(pluginId) {
    const data = useDocsData(pluginId);
    return data.versions;
}
export function useLatestVersion(pluginId) {
    const data = useDocsData(pluginId);
    return getLatestVersion(data);
}
/**
 * Returns `undefined` on doc-unrelated pages, because there's no version
 * currently considered as active.
 */
export function useActiveVersion(pluginId) {
    const data = useDocsData(pluginId);
    const { pathname } = useLocation();
    return getActiveVersion(data, pathname);
}
export function useActiveDocContext(pluginId) {
    const data = useDocsData(pluginId);
    const { pathname } = useLocation();
    return getActiveDocContext(data, pathname);
}
/**
 * Useful to say "hey, you are not on the latest docs version, please switch"
 */
export function useDocVersionSuggestions(pluginId) {
    const data = useDocsData(pluginId);
    const { pathname } = useLocation();
    return getDocVersionSuggestions(data, pathname);
}
