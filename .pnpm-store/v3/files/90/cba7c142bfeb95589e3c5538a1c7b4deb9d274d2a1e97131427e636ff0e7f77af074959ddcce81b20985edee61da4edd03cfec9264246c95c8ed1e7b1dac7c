"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartiallySafeHint = exports.SwizzleActionsStatuses = exports.SwizzleActions = void 0;
exports.actionStatusLabel = actionStatusLabel;
exports.actionStatusColor = actionStatusColor;
exports.actionStatusSuffix = actionStatusSuffix;
exports.normalizeOptions = normalizeOptions;
exports.findStringIgnoringCase = findStringIgnoringCase;
exports.findClosestValue = findClosestValue;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const leven_1 = tslib_1.__importDefault(require("leven"));
exports.SwizzleActions = ['wrap', 'eject'];
exports.SwizzleActionsStatuses = [
    'safe',
    'unsafe',
    'forbidden',
];
exports.PartiallySafeHint = logger_1.default.red('*');
function actionStatusLabel(status) {
    return lodash_1.default.capitalize(status);
}
const SwizzleActionStatusColors = {
    safe: logger_1.default.green,
    unsafe: logger_1.default.yellow,
    forbidden: logger_1.default.red,
};
function actionStatusColor(status, str) {
    const colorFn = SwizzleActionStatusColors[status];
    return colorFn(str);
}
function actionStatusSuffix(status, options = {}) {
    return ` (${actionStatusColor(status, actionStatusLabel(status))}${options.partiallySafe ? exports.PartiallySafeHint : ''})`;
}
function normalizeOptions(options) {
    return {
        typescript: options.typescript ?? false,
        javascript: options.javascript ?? false,
        danger: options.danger ?? false,
        list: options.list ?? false,
        wrap: options.wrap ?? false,
        eject: options.eject ?? false,
        config: options.config ?? undefined,
    };
}
function findStringIgnoringCase(str, values) {
    return values.find((v) => v.toLowerCase() === str.toLowerCase());
}
function findClosestValue(str, values, maxLevenshtein = 3) {
    return values.find((v) => (0, leven_1.default)(v, str) <= maxLevenshtein);
}
