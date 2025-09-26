/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { SiteStorage } from '@docusaurus/types';
import type { ThemeConfig } from '@docusaurus/theme-common';
export declare function getThemeInlineScript({ colorMode: { disableSwitch, defaultMode, respectPrefersColorScheme }, siteStorage, }: {
    colorMode: ThemeConfig['colorMode'];
    siteStorage: SiteStorage;
}): string;
export declare const DataAttributeQueryStringInlineJavaScript = "\n(function() {\n  try {\n    const entries = new URLSearchParams(window.location.search).entries();\n    for (var [searchKey, value] of entries) {\n      if (searchKey.startsWith('docusaurus-data-')) {\n        var key = searchKey.replace('docusaurus-data-',\"data-\")\n        document.documentElement.setAttribute(key, value);\n      }\n    }\n  } catch(e) {}\n})();\n";
export declare function getAnnouncementBarInlineScript({ siteStorage, }: {
    siteStorage: SiteStorage;
}): string;
