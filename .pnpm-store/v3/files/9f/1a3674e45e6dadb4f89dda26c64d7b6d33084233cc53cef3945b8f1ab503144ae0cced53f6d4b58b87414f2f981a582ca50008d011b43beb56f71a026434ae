"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHostPort = getHostPort;
const tslib_1 = require("tslib");
const child_process_1 = require("child_process");
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const detect_port_1 = tslib_1.__importDefault(require("detect-port"));
const utils_1 = require("@docusaurus/utils");
const prompts_1 = tslib_1.__importDefault(require("prompts"));
const execOptions = {
    encoding: 'utf8',
    stdio: [/* stdin */ 'pipe', /* stdout */ 'pipe', /* stderr */ 'ignore'],
};
function clearConsole() {
    process.stdout.write(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H');
}
function getProcessForPort(port) {
    try {
        const processId = (0, child_process_1.execSync)(`lsof -i:${port} -P -t -sTCP:LISTEN`, execOptions)
            .split('\n')[0]
            .trim();
        const directory = (0, child_process_1.execSync)(`lsof -p ${processId} | awk '$4=="cwd" {for (i=9; i<=NF; i++) printf "%s ", $i}'`, execOptions).trim();
        const command = (0, child_process_1.execSync)(`ps -o command -p ${processId} | sed -n 2p`, execOptions).replace(/\n$/, '');
        return logger_1.default.interpolate `code=${command} subdue=${`(pid ${processId})`} in path=${directory}`;
    }
    catch {
        return null;
    }
}
/**
 * Detects if program is running on port, and prompts user to choose another if
 * port is already being used. This feature was heavily inspired by
 * create-react-app and uses many of the same utility functions to implement it.
 */
async function choosePort(host, defaultPort) {
    try {
        const port = await (0, detect_port_1.default)({
            port: defaultPort,
            ...(host !== 'localhost' && { hostname: host }),
        });
        if (port === defaultPort) {
            return port;
        }
        const isRoot = process.getuid?.() === 0;
        const isInteractive = process.stdout.isTTY;
        const message = process.platform !== 'win32' && defaultPort < 1024 && !isRoot
            ? `Admin permissions are required to run a server on a port below 1024.`
            : `Something is already running on port ${defaultPort}.`;
        if (!isInteractive) {
            logger_1.default.error(message);
            return null;
        }
        clearConsole();
        const existingProcess = getProcessForPort(defaultPort);
        const { shouldChangePort } = (await (0, prompts_1.default)({
            type: 'confirm',
            name: 'shouldChangePort',
            message: logger_1.default.yellow(`${logger_1.default.bold('[WARNING]')} ${message}${existingProcess ? ` Probably:\n  ${existingProcess}` : ''}

Would you like to run the app on another port instead?`),
            initial: true,
        }));
        return shouldChangePort ? port : null;
    }
    catch (err) {
        logger_1.default.error `Could not find an open port at ${host}.`;
        throw err;
    }
}
async function getHostPort(options) {
    const host = options.host ?? 'localhost';
    const basePort = options.port ? parseInt(options.port, 10) : utils_1.DEFAULT_PORT;
    const port = await choosePort(host, basePort);
    return { host, port };
}
