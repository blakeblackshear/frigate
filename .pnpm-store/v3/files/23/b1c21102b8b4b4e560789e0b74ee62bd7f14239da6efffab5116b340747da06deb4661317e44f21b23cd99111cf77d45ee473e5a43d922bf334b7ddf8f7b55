"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.askPreferredLanguage = askPreferredLanguage;
const tslib_1 = require("tslib");
const prompts_1 = tslib_1.__importDefault(require("prompts"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const DefaultOptions = {
    fallback: undefined,
    exit: false,
};
const ExitChoice = { title: logger_1.default.yellow('[Exit]'), value: '[Exit]' };
async function askPreferredLanguage(options = {}) {
    const { fallback, exit } = { ...DefaultOptions, ...options };
    const choices = [
        { title: logger_1.default.bold('JavaScript'), value: 'javascript' },
        { title: logger_1.default.bold('TypeScript'), value: 'typescript' },
    ];
    if (exit) {
        choices.push(ExitChoice);
    }
    const { language } = await (0, prompts_1.default)({
        type: 'select',
        name: 'language',
        message: 'Which language do you want to use?',
        choices,
    }, {
        onCancel() {
            exit && process.exit(0);
        },
    });
    if (language === ExitChoice.value) {
        process.exit(0);
    }
    if (!language) {
        if (fallback) {
            logger_1.default.info `Falling back to language=${fallback}`;
            return fallback;
        }
        process.exit(0);
    }
    return language;
}
//# sourceMappingURL=cliUtils.js.map