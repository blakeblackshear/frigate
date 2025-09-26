/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * Permits to obtain the url of the current page in another locale, useful to
 * generate hreflang meta headers etc...
 *
 * @see https://developers.google.com/search/docs/advanced/crawling/localized-versions
 */
export declare function useAlternatePageUtils(): {
    /**
     * Everything (pathname, base URL, etc.) is read from the context. Just tell
     * it which locale to link to and it will give you the alternate link for the
     * current page.
     */
    createUrl: ({ 
    /** The locale name to link to. */
    locale, 
    /**
     * For hreflang SEO headers, we need it to be fully qualified (full
     * protocol/domain/path...); but for locale dropdowns, using a pathname is
     * good enough.
     */
    fullyQualified, }: {
        locale: string;
        fullyQualified: boolean;
    }) => string;
};
//# sourceMappingURL=useAlternatePageUtils.d.ts.map