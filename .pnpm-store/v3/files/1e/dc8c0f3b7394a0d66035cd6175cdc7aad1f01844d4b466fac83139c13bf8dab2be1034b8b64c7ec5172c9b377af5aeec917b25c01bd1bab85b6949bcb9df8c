"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultLocaleConfig = getDefaultLocaleConfig;
exports.loadI18n = loadI18n;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const combine_promises_1 = tslib_1.__importDefault(require("combine-promises"));
const utils_1 = require("@docusaurus/utils");
function inferLanguageDisplayName(locale) {
    const tryLocale = (l) => {
        try {
            return new Intl.DisplayNames(l, {
                type: 'language',
                fallback: 'code',
            }).of(l);
        }
        catch (e) {
            // This is to compensate "of()" that is a bit strict
            // Looks like starting Node 22, this locale throws: "en-US-u-ca-buddhist"
            // RangeError: invalid_argument
            return null;
        }
    };
    const parts = locale.split('-');
    // This is a best effort, we try various locale forms that could give a result
    return (tryLocale(locale) ??
        tryLocale(`${parts[0]}-${parts[1]}`) ??
        tryLocale(parts[0]));
}
function getDefaultLocaleLabel(locale) {
    const languageName = inferLanguageDisplayName(locale);
    if (!languageName) {
        return locale;
    }
    return (languageName.charAt(0).toLocaleUpperCase(locale) + languageName.substring(1));
}
function getDefaultCalendar(localeStr) {
    const locale = new Intl.Locale(localeStr);
    // If the locale name includes -u-ca-xxx the calendar will be defined
    if (locale.calendar) {
        return locale.calendar;
    }
    // Not well-supported but server code can infer a calendar from the locale
    // See https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getCalendars
    // See https://caniuse.com/mdn-javascript_builtins_intl_locale_getcalendars
    const calendars = 
    // @ts-expect-error: new std method (Bun/JSC/WebKit)
    locale.getCalendars?.() ??
        // @ts-expect-error: non-std attribute (V8/Chromium/Node)
        locale.calendars;
    if (calendars instanceof Array && calendars[0]) {
        return calendars[0];
    }
    return 'gregory';
}
function getDefaultDirection(localeStr) {
    const locale = new Intl.Locale(localeStr);
    // see https://github.com/tc39/proposal-intl-locale-info
    // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/getTextInfo
    // Node 18.0 implements a former version of the getTextInfo() proposal
    // TODO Docusaurus v4: remove the fallback to locale.textInfo
    // @ts-expect-error: The TC39 proposal was updated
    const textInto = locale.getTextInfo?.() ?? locale.textInfo;
    return textInto.direction;
}
function getDefaultLocaleConfig(locale) {
    try {
        return {
            label: getDefaultLocaleLabel(locale),
            direction: getDefaultDirection(locale),
            htmlLang: locale,
            calendar: getDefaultCalendar(locale),
            path: locale,
        };
    }
    catch (e) {
        throw new Error(`Docusaurus couldn't get default locale config for ${locale}`, { cause: e });
    }
}
async function loadI18n({ siteDir, config, currentLocale, automaticBaseUrlLocalizationDisabled, }) {
    const { i18n: i18nConfig } = config;
    if (!i18nConfig.locales.includes(currentLocale)) {
        logger_1.default.warn `The locale name=${currentLocale} was not found in your site configuration: Available locales are: ${i18nConfig.locales}
Note: Docusaurus only support running one locale at a time.`;
    }
    const locales = i18nConfig.locales.includes(currentLocale)
        ? i18nConfig.locales
        : i18nConfig.locales.concat(currentLocale);
    async function getFullLocaleConfig(locale) {
        const localeConfigInput = i18nConfig.localeConfigs[locale] ?? {};
        const localeConfig = {
            ...getDefaultLocaleConfig(locale),
            ...localeConfigInput,
        };
        // By default, translations will be enabled if i18n/<locale> dir exists
        async function inferTranslate() {
            const localizationDir = path_1.default.resolve(siteDir, i18nConfig.path, localeConfig.path);
            return fs_extra_1.default.pathExists(localizationDir);
        }
        function getInferredBaseUrl() {
            const addLocaleSegment = locale !== i18nConfig.defaultLocale &&
                !automaticBaseUrlLocalizationDisabled;
            return (0, utils_1.normalizeUrl)([
                '/',
                config.baseUrl,
                addLocaleSegment ? locale : '',
                '/',
            ]);
        }
        const translate = localeConfigInput.translate ?? (await inferTranslate());
        const url = typeof localeConfigInput.url !== 'undefined'
            ? localeConfigInput.url
            : config.url;
        const baseUrl = typeof localeConfigInput.baseUrl !== 'undefined'
            ? (0, utils_1.normalizeUrl)(['/', localeConfigInput.baseUrl, '/'])
            : getInferredBaseUrl();
        return {
            ...localeConfig,
            translate,
            url,
            baseUrl,
        };
    }
    const localeConfigs = await (0, combine_promises_1.default)(Object.fromEntries(locales.map((locale) => [locale, getFullLocaleConfig(locale)])));
    return {
        defaultLocale: i18nConfig.defaultLocale,
        locales,
        path: i18nConfig.path,
        currentLocale,
        localeConfigs,
    };
}
