/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { useCallback } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useQueryString } from '../utils/historyUtils';
const SEARCH_PARAM_QUERY = 'q';
/**
 * Permits to read/write the current search query string
 */
export function useSearchQueryString() {
    return useQueryString(SEARCH_PARAM_QUERY);
}
/**
 * Permits to create links to the search page with the appropriate query string
 */
export function useSearchLinkCreator() {
    const { siteConfig: { baseUrl, themeConfig }, } = useDocusaurusContext();
    const { algolia: { searchPagePath }, } = themeConfig;
    return useCallback((searchValue) => 
    // Refer to https://github.com/facebook/docusaurus/pull/2838
    // Note: if searchPagePath is falsy, useSearchPage() will not be called
    `${baseUrl}${searchPagePath}?${SEARCH_PARAM_QUERY}=${encodeURIComponent(searchValue)}`, [baseUrl, searchPagePath]);
}
//# sourceMappingURL=useSearchPage.js.map