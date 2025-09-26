"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeTranslationLocalesToTry = codeTranslationLocalesToTry;
exports.readDefaultCodeTranslationMessages = readDefaultCodeTranslationMessages;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
function getDefaultLocalesDirPath() {
    return path_1.default.join(__dirname, '../locales');
}
// Return an ordered list of locales we should try
function codeTranslationLocalesToTry(locale) {
    const intlLocale = new Intl.Locale(locale);
    // If locale is just a simple language like "pt", we want to fallback to
    // "pt-BR" (not "pt-PT"!)
    // See https://github.com/facebook/docusaurus/pull/4536#issuecomment-810088783
    const maximizedLocale = intlLocale.maximize(); // "pt-Latn-BR"
    return [
        // May be "zh", "zh-CN", "zh-Hans", "zh-cn", or anything: very likely to be
        // unresolved except for simply locales
        locale,
        // "zh-CN" / "pt-BR"
        `${maximizedLocale.language}-${maximizedLocale.region}`,
        // "zh-Hans" / "pt-Latn"
        `${maximizedLocale.language}-${maximizedLocale.script}`,
        // "zh" / "pt"
        maximizedLocale.language,
    ];
}
// Useful to implement getDefaultCodeTranslationMessages() in themes
async function readDefaultCodeTranslationMessages({ dirPath = getDefaultLocalesDirPath(), locale, name, }) {
    const localesToTry = codeTranslationLocalesToTry(locale);
    // Return the content of the first file that match
    // fr_FR.json => fr.json => nothing
    for (const localeToTry of localesToTry) {
        const filePath = path_1.default.resolve(dirPath, localeToTry, `${name}.json`);
        if (await fs_extra_1.default.pathExists(filePath)) {
            return fs_extra_1.default.readJSON(filePath);
        }
    }
    return {};
}
//# sourceMappingURL=index.js.map