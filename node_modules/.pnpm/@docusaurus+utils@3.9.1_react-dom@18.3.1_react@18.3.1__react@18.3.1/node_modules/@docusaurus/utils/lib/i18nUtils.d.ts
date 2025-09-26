/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { TranslationFileContent, TranslationFile, I18n, I18nLocaleConfig } from '@docusaurus/types';
/**
 * Takes a list of translation file contents, and shallow-merges them into one.
 */
export declare function mergeTranslations(contents: TranslationFileContent[]): TranslationFileContent;
/**
 * Useful to update all the messages of a translation file. Used in tests to
 * simulate translations.
 */
export declare function updateTranslationFileMessages(translationFile: TranslationFile, updateMessage: (message: string) => string): TranslationFile;
/**
 * Takes everything needed and constructs a plugin i18n path. Plugins should
 * expect everything it needs for translations to be found under this path.
 */
export declare function getPluginI18nPath({ localizationDir, pluginName, pluginId, subPaths, }: {
    localizationDir: string;
    pluginName: string;
    pluginId?: string | undefined;
    subPaths?: string[];
}): string;
export declare function getLocaleConfig(i18n: I18n, locale?: string): I18nLocaleConfig;
//# sourceMappingURL=i18nUtils.d.ts.map