"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.askThemeName = askThemeName;
exports.askComponentName = askComponentName;
exports.askSwizzleDangerousComponent = askSwizzleDangerousComponent;
exports.askSwizzleAction = askSwizzleAction;
const tslib_1 = require("tslib");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const prompts_1 = tslib_1.__importDefault(require("prompts"));
const common_1 = require("./common");
const ExitTitle = logger_1.default.yellow('[Exit]');
async function askThemeName(themeNames) {
    const { themeName } = (await (0, prompts_1.default)({
        type: 'select',
        name: 'themeName',
        message: 'Select a theme to swizzle:',
        choices: themeNames
            .map((theme) => ({ title: theme, value: theme }))
            .concat({ title: ExitTitle, value: '[Exit]' }),
    }));
    if (!themeName || themeName === '[Exit]') {
        process.exit(0);
    }
    return themeName;
}
async function askComponentName(themeComponents) {
    function formatComponentName(componentName) {
        const anySafe = themeComponents.hasAnySafeAction(componentName);
        const allSafe = themeComponents.hasAllSafeAction(componentName);
        const safestStatus = anySafe ? 'safe' : 'unsafe'; // Not 100% accurate but good enough for now.
        const partiallySafe = anySafe && !allSafe;
        return `${componentName}${(0, common_1.actionStatusSuffix)(safestStatus, {
            partiallySafe,
        })}`;
    }
    const { componentName } = (await (0, prompts_1.default)({
        type: 'autocomplete',
        name: 'componentName',
        message: `
Select or type the component to swizzle.
${common_1.PartiallySafeHint} = not safe for all swizzle actions
`,
        // This doesn't work well in small-height terminals (like IDE)
        // limit: 30,
        // This does not work well and messes up with terminal scroll position
        // limit: Number.POSITIVE_INFINITY,
        choices: themeComponents.all
            .map((compName) => ({
            title: formatComponentName(compName),
            value: compName,
        }))
            .concat({ title: ExitTitle, value: '[Exit]' }),
        async suggest(input, choices) {
            return choices.filter((choice) => choice.title.toLowerCase().includes(input.toLowerCase()));
        },
    }));
    logger_1.default.newLine();
    if (!componentName || componentName === '[Exit]') {
        return process.exit(0);
    }
    return componentName;
}
async function askSwizzleDangerousComponent() {
    const { switchToDanger } = (await (0, prompts_1.default)({
        type: 'select',
        name: 'switchToDanger',
        message: `Do you really want to swizzle this unsafe internal component?`,
        choices: [
            { title: logger_1.default.green('NO: cancel and stay safe'), value: false },
            {
                title: logger_1.default.red('YES: I know what I am doing!'),
                value: true,
            },
            { title: ExitTitle, value: '[Exit]' },
        ],
    }));
    if (typeof switchToDanger === 'undefined' || switchToDanger === '[Exit]') {
        return process.exit(0);
    }
    return !!switchToDanger;
}
async function askSwizzleAction(componentConfig) {
    const { action } = (await (0, prompts_1.default)({
        type: 'select',
        name: 'action',
        message: `Which swizzle action do you want to do?`,
        choices: [
            {
                title: `${logger_1.default.bold('Wrap')}${(0, common_1.actionStatusSuffix)(componentConfig.actions.wrap)}`,
                value: 'wrap',
            },
            {
                title: `${logger_1.default.bold('Eject')}${(0, common_1.actionStatusSuffix)(componentConfig.actions.eject)}`,
                value: 'eject',
            },
            { title: ExitTitle, value: '[Exit]' },
        ],
    }));
    if (typeof action === 'undefined' || action === '[Exit]') {
        return process.exit(0);
    }
    return action;
}
