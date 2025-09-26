"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const path = (msg) => chalk_1.default.cyan.underline(`"${String(msg)}"`);
const url = (msg) => chalk_1.default.cyan.underline(msg);
const name = (msg) => chalk_1.default.blue.bold(msg);
const code = (msg) => chalk_1.default.cyan(`\`${String(msg)}\``);
const subdue = (msg) => chalk_1.default.gray(msg);
const num = (msg) => chalk_1.default.yellow(msg);
function interpolate(msgs, ...values) {
    let res = '';
    values.forEach((value, idx) => {
        const flag = msgs[idx].match(/[a-z]+=$/);
        res += msgs[idx].replace(/[a-z]+=$/, '');
        const format = (() => {
            if (!flag) {
                return (a) => a;
            }
            switch (flag[0]) {
                case 'path=':
                    return path;
                case 'url=':
                    return url;
                case 'number=':
                    return num;
                case 'name=':
                    return name;
                case 'subdue=':
                    return subdue;
                case 'code=':
                    return code;
                default:
                    throw new Error('Bad Docusaurus logging message. This is likely an internal bug, please report it.');
            }
        })();
        res += Array.isArray(value)
            ? `\n- ${value.map((v) => format(v)).join('\n- ')}`
            : format(value);
    });
    res += msgs.slice(-1)[0];
    return res;
}
function stringify(msg) {
    if (String(msg) === '[object Object]') {
        return JSON.stringify(msg);
    }
    if (msg instanceof Date) {
        return msg.toUTCString();
    }
    return String(msg);
}
function info(msg, ...values) {
    console.info(`${chalk_1.default.cyan.bold('[INFO]')} ${values.length === 0
        ? stringify(msg)
        : interpolate(msg, ...values)}`);
}
function warn(msg, ...values) {
    console.warn(chalk_1.default.yellow(`${chalk_1.default.bold('[WARNING]')} ${values.length === 0
        ? stringify(msg)
        : interpolate(msg, ...values)}`));
}
function error(msg, ...values) {
    console.error(chalk_1.default.red(`${chalk_1.default.bold('[ERROR]')} ${values.length === 0
        ? stringify(msg)
        : interpolate(msg, ...values)}`));
}
function success(msg, ...values) {
    console.log(`${chalk_1.default.green.bold('[SUCCESS]')} ${values.length === 0
        ? stringify(msg)
        : interpolate(msg, ...values)}`);
}
function throwError(msg, ...values) {
    throw new Error(values.length === 0
        ? stringify(msg)
        : interpolate(msg, ...values));
}
function newLine() {
    console.log();
}
/**
 * Takes a message and reports it according to the severity that the user wants.
 *
 * - `ignore`: completely no-op
 * - `log`: uses the `INFO` log level
 * - `warn`: uses the `WARN` log level
 * - `throw`: aborts the process, throws the error.
 *
 * Since the logger doesn't have logging level filters yet, these severities
 * mostly just differ by their colors.
 *
 * @throws In addition to throwing when `reportingSeverity === "throw"`, this
 * function also throws if `reportingSeverity` is not one of the above.
 */
function report(reportingSeverity) {
    const reportingMethods = {
        ignore: () => { },
        log: info,
        warn,
        throw: throwError,
    };
    if (!Object.prototype.hasOwnProperty.call(reportingMethods, reportingSeverity)) {
        throw new Error(`Unexpected "reportingSeverity" value: ${reportingSeverity}.`);
    }
    return reportingMethods[reportingSeverity];
}
const logger = {
    red: (msg) => chalk_1.default.red(msg),
    yellow: (msg) => chalk_1.default.yellow(msg),
    green: (msg) => chalk_1.default.green(msg),
    cyan: (msg) => chalk_1.default.cyan(msg),
    bold: (msg) => chalk_1.default.bold(msg),
    dim: (msg) => chalk_1.default.dim(msg),
    path,
    url,
    name,
    code,
    subdue,
    num,
    interpolate,
    info,
    warn,
    error,
    success,
    report,
    newLine,
};
exports.default = logger;
//# sourceMappingURL=logger.js.map