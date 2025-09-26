"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.helpTables = helpTables;
exports.themeComponentsTable = themeComponentsTable;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const cli_table3_1 = tslib_1.__importDefault(require("cli-table3"));
const actions_1 = require("./actions");
const common_1 = require("./common");
function tableStatusLabel(status) {
    return (0, common_1.actionStatusColor)(status, (0, common_1.actionStatusLabel)(status));
}
function getStatusLabel(status) {
    return (0, common_1.actionStatusColor)(status, (0, common_1.actionStatusLabel)(status));
}
function statusTable() {
    const table = new cli_table3_1.default({
        head: ['Status', 'CLI option', 'Description'],
    });
    table.push({
        [tableStatusLabel('safe')]: [
            '',
            `
This component is safe to swizzle and was designed for this purpose.
The swizzled component is retro-compatible with minor version upgrades.
`,
        ],
    }, {
        [tableStatusLabel('unsafe')]: [
            logger_1.default.code('--danger'),
            `
This component is unsafe to swizzle, but you can still do it!
Warning: we may release breaking changes within minor version upgrades.
You will have to upgrade your component manually and maintain it over time.

${logger_1.default.green('Tip')}: your customization can't be done in a ${tableStatusLabel('safe')} way?
Report it here: https://github.com/facebook/docusaurus/discussions/5468
`,
        ],
    }, {
        [tableStatusLabel('forbidden')]: [
            '',
            `
This component is not meant to be swizzled.
`,
        ],
    });
    return table.toString();
}
function actionsTable() {
    const table = new cli_table3_1.default({
        head: ['Actions', 'CLI option', 'Description'],
    });
    table.push({
        [logger_1.default.bold('Wrap')]: [
            logger_1.default.code('--wrap'),
            `
Creates a wrapper around the original theme component.
Allows rendering other components before/after the original theme component.

${logger_1.default.green('Tip')}: prefer ${logger_1.default.code('--wrap')} whenever possible to reduce the amount of code to maintain.
      `,
        ],
    }, {
        [logger_1.default.bold('Eject')]: [
            logger_1.default.code('--eject'),
            `
Ejects the full source code of the original theme component.
Allows overriding of the original component entirely with your own UI and logic.

${logger_1.default.green('Tip')}: ${logger_1.default.code('--eject')} can be useful for completely redesigning a component.
`,
        ],
    });
    return table.toString();
}
function helpTables() {
    return `${logger_1.default.bold('Swizzle actions')}:
${actionsTable()}

${logger_1.default.bold('Swizzle safety statuses')}:
${statusTable()}

${logger_1.default.bold('Swizzle guide')}: https://docusaurus.io/docs/swizzling`;
}
function themeComponentsTable(themeComponents) {
    const table = new cli_table3_1.default({
        head: [
            'Component name',
            ...actions_1.SwizzleActions.map((action) => lodash_1.default.capitalize(action)),
            'Description',
        ],
    });
    themeComponents.all.forEach((component) => {
        table.push({
            [component]: [
                ...actions_1.SwizzleActions.map((action) => getStatusLabel(themeComponents.getActionStatus(component, action))),
                themeComponents.getDescription(component),
            ],
        });
    });
    return `${logger_1.default.bold(`Components available for swizzle in ${logger_1.default.name(themeComponents.themeName)}`)}:
${table.toString()}
`;
}
