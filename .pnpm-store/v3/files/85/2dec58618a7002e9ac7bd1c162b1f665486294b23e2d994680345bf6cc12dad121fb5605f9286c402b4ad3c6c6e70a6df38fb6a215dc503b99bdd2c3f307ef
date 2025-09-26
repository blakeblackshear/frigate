"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.swizzle = swizzle;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const themes_1 = require("./themes");
const components_1 = require("./components");
const tables_1 = require("./tables");
const common_1 = require("./common");
const actions_1 = require("./actions");
const config_1 = require("./config");
const prompts_1 = require("./prompts");
const context_1 = require("./context");
async function getLanguageForThemeName({ themeName, plugins, options, }) {
    const plugin = (0, themes_1.getPluginByThemeName)(plugins, themeName);
    const supportsTS = !!plugin.instance.getTypeScriptThemePath?.();
    if (options.typescript) {
        if (!supportsTS) {
            throw new Error(logger_1.default.interpolate `Theme name=${plugin.instance.name} does not support the code=${'--typescript'} CLI option.`);
        }
        return 'typescript';
    }
    if (options.javascript) {
        return 'javascript';
    }
    // It's only useful to prompt the user for themes that support both JS/TS
    if (supportsTS) {
        return (0, utils_1.askPreferredLanguage)({ exit: true });
    }
    return 'javascript';
}
async function listAllThemeComponents({ themeNames, plugins, typescript, }) {
    const themeComponentsTables = (await Promise.all(themeNames.map(async (themeName) => {
        const themePath = (0, themes_1.getThemePath)({ themeName, plugins, typescript });
        const swizzleConfig = (0, config_1.getThemeSwizzleConfig)(themeName, plugins);
        const themeComponents = await (0, components_1.getThemeComponents)({
            themeName,
            themePath,
            swizzleConfig,
        });
        return (0, tables_1.themeComponentsTable)(themeComponents);
    }))).join('\n\n');
    logger_1.default.info(`All theme components available to swizzle:

${themeComponentsTables}

${(0, tables_1.helpTables)()}
    `);
    return process.exit(0);
}
async function ensureActionSafety({ componentName, componentConfig, action, danger, }) {
    const actionStatus = componentConfig.actions[action];
    if (actionStatus === 'forbidden') {
        logger_1.default.error `
Swizzle action name=${action} is forbidden for component name=${componentName}
`;
        return process.exit(1);
    }
    if (actionStatus === 'unsafe' && !danger) {
        logger_1.default.warn `
Swizzle action name=${action} is unsafe to perform on name=${componentName}.
It is more likely to be affected by breaking changes in the future
If you want to swizzle it, use the code=${'--danger'} flag, or confirm that you understand the risks.
`;
        const swizzleDangerousComponent = await (0, prompts_1.askSwizzleDangerousComponent)();
        if (!swizzleDangerousComponent) {
            return process.exit(1);
        }
    }
    return undefined;
}
async function swizzle(themeNameParam = undefined, componentNameParam = undefined, siteDirParam = '.', optionsParam = {}) {
    const siteDir = await fs_extra_1.default.realpath(siteDirParam);
    const options = (0, common_1.normalizeOptions)(optionsParam);
    const { list, danger } = options;
    const { plugins } = await (0, context_1.initSwizzleContext)(siteDir, options);
    const themeNames = (0, themes_1.getThemeNames)(plugins);
    if (list && !themeNameParam) {
        await listAllThemeComponents({
            themeNames,
            plugins,
            typescript: options.typescript,
        });
    }
    const themeName = await (0, themes_1.getThemeName)({ themeNameParam, themeNames, list });
    const language = await getLanguageForThemeName({ themeName, plugins, options });
    const typescript = language === 'typescript';
    const themePath = (0, themes_1.getThemePath)({
        themeName,
        plugins,
        typescript,
    });
    const swizzleConfig = (0, config_1.getThemeSwizzleConfig)(themeName, plugins);
    const themeComponents = await (0, components_1.getThemeComponents)({
        themeName,
        themePath,
        swizzleConfig,
    });
    const componentName = await (0, components_1.getComponentName)({
        componentNameParam,
        themeComponents,
        list,
    });
    const componentConfig = themeComponents.getConfig(componentName);
    const action = await (0, actions_1.getAction)(componentConfig, options);
    await ensureActionSafety({ componentName, componentConfig, action, danger });
    async function executeAction() {
        switch (action) {
            case 'wrap': {
                const result = await (0, actions_1.wrap)({
                    siteDir,
                    themePath,
                    componentName,
                    typescript,
                });
                logger_1.default.success `
Created wrapper of name=${componentName} from name=${themeName} in path=${result.createdFiles}
`;
                return result;
            }
            case 'eject': {
                const result = await (0, actions_1.eject)({
                    siteDir,
                    themePath,
                    componentName,
                    typescript,
                });
                logger_1.default.success `
Ejected name=${componentName} from name=${themeName} to path=${result.createdFiles}
`;
                return result;
            }
            default:
                throw new Error(`Unexpected action ${action}`);
        }
    }
    await executeAction();
    return process.exit(0);
}
