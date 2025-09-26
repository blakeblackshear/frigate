/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { TranslationFile } from '@docusaurus/types';
import type { ThemeConfig } from '@docusaurus/theme-common';
export declare function getTranslationFiles({ themeConfig, }: {
    themeConfig: ThemeConfig;
}): TranslationFile[];
export declare function translateThemeConfig({ themeConfig, translationFiles, }: {
    themeConfig: ThemeConfig;
    translationFiles: TranslationFile[];
}): ThemeConfig;
