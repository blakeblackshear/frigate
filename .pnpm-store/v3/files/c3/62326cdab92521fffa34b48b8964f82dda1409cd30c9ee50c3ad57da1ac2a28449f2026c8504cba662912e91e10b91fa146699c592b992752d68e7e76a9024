"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMissingIntermediateComponentFolderNames = getMissingIntermediateComponentFolderNames;
exports.readComponentNames = readComponentNames;
exports.listComponentNames = listComponentNames;
exports.getThemeComponents = getThemeComponents;
exports.getComponentName = getComponentName;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const prompts_1 = require("./prompts");
const common_1 = require("./common");
const tables_1 = require("./tables");
const actions_1 = require("./actions");
const formatComponentName = (componentName) => componentName.replace(/[/\\]index\.[jt]sx?/, '').replace(/\.[jt]sx?/, '');
function sortComponentNames(componentNames) {
    return componentNames.sort(); // Algo may change?
}
/**
 * Expand a list of components to include and return parent folders.
 * If a folder is not directly a component (no Folder/index.tsx file),
 * we still want to be able to swizzle --eject that folder.
 * See https://github.com/facebook/docusaurus/pull/7175#issuecomment-1103757218
 *
 * @param componentNames the original list of component names
 */
function getMissingIntermediateComponentFolderNames(componentNames) {
    function getAllIntermediatePaths(componentName) {
        const paths = componentName.split('/');
        return lodash_1.default.range(1, paths.length + 1).map((i) => paths.slice(0, i).join('/'));
    }
    const expandedComponentNames = lodash_1.default.uniq(componentNames.flatMap((componentName) => getAllIntermediatePaths(componentName)));
    return lodash_1.default.difference(expandedComponentNames, componentNames);
}
const skipReadDirNames = ['__test__', '__tests__', '__mocks__', '__fixtures__'];
async function readComponentNames(themePath) {
    if (!(await fs_extra_1.default.pathExists(themePath))) {
        return [];
    }
    async function walk(dir) {
        const files = await Promise.all((await fs_extra_1.default.readdir(dir)).flatMap(async (file) => {
            const fullPath = path_1.default.join(dir, file);
            const stat = await fs_extra_1.default.stat(fullPath);
            const isDir = stat.isDirectory();
            return { file, fullPath, isDir };
        }));
        return (await Promise.all(files.map(async (file) => {
            if (file.isDir) {
                if (skipReadDirNames.includes(file.file)) {
                    return [];
                }
                return walk(file.fullPath);
            }
            else if (
            // TODO can probably be refactored
            /(?<!\.d)\.[jt]sx?$/.test(file.fullPath) &&
                !/(?<!\.d)\.(?:test|tests|story|stories)\.[jt]sx?$/.test(file.fullPath)) {
                const componentName = formatComponentName((0, utils_1.posixPath)(path_1.default.relative(themePath, file.fullPath)));
                return [{ ...file, componentName }];
            }
            return [];
        }))).flat();
    }
    const componentFiles = await walk(themePath);
    const componentNames = componentFiles.map((f) => f.componentName);
    return sortComponentNames(componentNames);
}
function listComponentNames(themeComponents) {
    if (themeComponents.all.length === 0) {
        return 'No component to swizzle.';
    }
    return `${(0, tables_1.themeComponentsTable)(themeComponents)}

${(0, tables_1.helpTables)()}
`;
}
async function getThemeComponents({ themeName, themePath, swizzleConfig, }) {
    const FallbackSwizzleActionStatus = 'unsafe';
    const FallbackSwizzleComponentDescription = 'N/A';
    const FallbackSwizzleComponentConfig = {
        actions: {
            wrap: FallbackSwizzleActionStatus,
            eject: FallbackSwizzleActionStatus,
        },
        description: FallbackSwizzleComponentDescription,
    };
    const FallbackIntermediateFolderSwizzleComponentConfig = {
        actions: {
            // It doesn't make sense to wrap an intermediate folder
            // because it has not any index component
            wrap: 'forbidden',
            eject: FallbackSwizzleActionStatus,
        },
        description: FallbackSwizzleComponentDescription,
    };
    const allInitialComponents = await readComponentNames(themePath);
    const missingIntermediateComponentFolderNames = getMissingIntermediateComponentFolderNames(allInitialComponents);
    const allComponents = sortComponentNames(allInitialComponents.concat(missingIntermediateComponentFolderNames));
    function getConfig(component) {
        if (!allComponents.includes(component)) {
            throw new Error(`Can't get component config: component doesn't exist: ${component}`);
        }
        const config = swizzleConfig.components[component];
        if (config) {
            return config;
        }
        const isIntermediateFolder = missingIntermediateComponentFolderNames.includes(component);
        if (isIntermediateFolder) {
            return FallbackIntermediateFolderSwizzleComponentConfig;
        }
        return (swizzleConfig.components[component] ?? FallbackSwizzleComponentConfig);
    }
    function getDescription(component) {
        return (getConfig(component).description ?? FallbackSwizzleComponentDescription);
    }
    function getActionStatus(component, action) {
        return getConfig(component).actions[action] ?? FallbackSwizzleActionStatus;
    }
    function isSafeAction(component, action) {
        return getActionStatus(component, action) === 'safe';
    }
    function hasAllSafeAction(component) {
        return actions_1.SwizzleActions.every((action) => isSafeAction(component, action));
    }
    function hasAnySafeAction(component) {
        return actions_1.SwizzleActions.some((action) => isSafeAction(component, action));
    }
    // Present the safest components first
    const orderedComponents = lodash_1.default.orderBy(allComponents, [
        hasAllSafeAction,
        (component) => isSafeAction(component, 'wrap'),
        (component) => isSafeAction(component, 'eject'),
        (component) => component,
    ], ['desc', 'desc', 'desc', 'asc']);
    return {
        themeName,
        all: orderedComponents,
        getConfig,
        getDescription,
        getActionStatus,
        isSafeAction,
        hasAnySafeAction,
        hasAllSafeAction,
    };
}
// Returns a valid value if recovering is possible
function handleInvalidComponentNameParam({ componentNameParam, themeComponents, }) {
    // Trying to recover invalid value
    // We look for potential matches that only differ in casing.
    const differentCaseMatch = (0, common_1.findStringIgnoringCase)(componentNameParam, themeComponents.all);
    if (differentCaseMatch) {
        logger_1.default.warn `Component name=${componentNameParam} doesn't exist.`;
        logger_1.default.info `name=${differentCaseMatch} will be used instead of name=${componentNameParam}.`;
        return differentCaseMatch;
    }
    // No recovery value is possible: print error
    logger_1.default.error `Component name=${componentNameParam} not found.`;
    const suggestion = (0, common_1.findClosestValue)(componentNameParam, themeComponents.all);
    if (suggestion) {
        logger_1.default.info `Did you mean name=${suggestion}? ${themeComponents.hasAnySafeAction(suggestion)
            ? `Note: this component is an unsafe internal component and can only be swizzled with code=${'--danger'} or explicit confirmation.`
            : ''}`;
    }
    else {
        logger_1.default.info(listComponentNames(themeComponents));
    }
    return process.exit(1);
}
async function handleComponentNameParam({ componentNameParam, themeComponents, }) {
    const isValidName = themeComponents.all.includes(componentNameParam);
    if (!isValidName) {
        return handleInvalidComponentNameParam({
            componentNameParam,
            themeComponents,
        });
    }
    return componentNameParam;
}
async function getComponentName({ componentNameParam, themeComponents, list, }) {
    if (list) {
        logger_1.default.info(listComponentNames(themeComponents));
        return process.exit(0);
    }
    const componentName = componentNameParam
        ? await handleComponentNameParam({
            componentNameParam,
            themeComponents,
        })
        : await (0, prompts_1.askComponentName)(themeComponents);
    return componentName;
}
