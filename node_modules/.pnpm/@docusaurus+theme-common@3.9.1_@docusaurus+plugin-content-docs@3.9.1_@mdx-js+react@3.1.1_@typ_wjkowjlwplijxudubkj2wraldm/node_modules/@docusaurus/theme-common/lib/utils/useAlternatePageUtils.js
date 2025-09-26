/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useLocation } from '@docusaurus/router';
import { applyTrailingSlash } from '@docusaurus/utils-common';
/**
 * Permits to obtain the url of the current page in another locale, useful to
 * generate hreflang meta headers etc...
 *
 * @see https://developers.google.com/search/docs/advanced/crawling/localized-versions
 */
export function useAlternatePageUtils() {
    const { siteConfig: { baseUrl, trailingSlash }, i18n: { localeConfigs }, } = useDocusaurusContext();
    // TODO using useLocation().pathname is not a super idea
    // See https://github.com/facebook/docusaurus/issues/9170
    const { pathname } = useLocation();
    const canonicalPathname = applyTrailingSlash(pathname, {
        trailingSlash,
        baseUrl,
    });
    // Canonical pathname, without the baseUrl of the current locale
    const pathnameSuffix = canonicalPathname.replace(baseUrl, '');
    function getLocaleConfig(locale) {
        const localeConfig = localeConfigs[locale];
        if (!localeConfig) {
            throw new Error(`Unexpected Docusaurus bug, no locale config found for locale=${locale}`);
        }
        return localeConfig;
    }
    function createUrl({ locale, fullyQualified, }) {
        const localeConfig = getLocaleConfig(locale);
        const newUrl = `${fullyQualified ? localeConfig.url : ''}`;
        const newBaseUrl = localeConfig.baseUrl;
        return `${newUrl}${newBaseUrl}${pathnameSuffix}`;
    }
    return { createUrl };
}
//# sourceMappingURL=useAlternatePageUtils.js.map