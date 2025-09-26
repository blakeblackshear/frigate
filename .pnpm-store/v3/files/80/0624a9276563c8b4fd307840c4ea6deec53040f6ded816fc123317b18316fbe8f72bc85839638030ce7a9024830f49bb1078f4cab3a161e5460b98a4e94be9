/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { TranslationFileContent, TranslationFile, CodeTranslations, InitializedPlugin, LoadedPlugin } from '@docusaurus/types';
export type WriteTranslationsOptions = {
    override?: boolean;
    messagePrefix?: string;
};
type TranslationContext = {
    localizationDir: string;
};
export declare function readCodeTranslationFileContent(context: TranslationContext): Promise<TranslationFileContent | undefined>;
export declare function writeCodeTranslations(context: TranslationContext, content: TranslationFileContent, options: WriteTranslationsOptions): Promise<void>;
export declare function writePluginTranslations({ localizationDir, plugin, translationFile, options, }: TranslationContext & {
    plugin: InitializedPlugin;
    translationFile: TranslationFile;
    options?: WriteTranslationsOptions;
}): Promise<void>;
export declare function localizePluginTranslationFile({ localizationDir, plugin, translationFile, }: TranslationContext & {
    plugin: InitializedPlugin;
    translationFile: TranslationFile;
}): Promise<TranslationFile>;
export declare function mergeCodeTranslations(codeTranslations: CodeTranslations[]): CodeTranslations;
export declare function loadPluginsDefaultCodeTranslationMessages(plugins: InitializedPlugin[]): Promise<CodeTranslations>;
export declare function getPluginsDefaultCodeTranslations({ plugins, }: {
    plugins: LoadedPlugin[];
}): CodeTranslations;
export declare function applyDefaultCodeTranslations({ extractedCodeTranslations, defaultCodeMessages, }: {
    extractedCodeTranslations: TranslationFileContent;
    defaultCodeMessages: CodeTranslations;
}): TranslationFileContent;
export declare function loadSiteCodeTranslations({ localizationDir, }: {
    localizationDir: string;
}): Promise<CodeTranslations>;
export {};
