"use strict";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="../../typings/thenable.d.ts" />
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConnection = exports.Files = void 0;
const node_util_1 = require("node:util");
const Is = require("../common/utils/is");
const server_1 = require("../common/server");
const fm = require("./files");
const node_1 = require("vscode-languageserver-protocol/node");
__exportStar(require("vscode-languageserver-protocol/node"), exports);
__exportStar(require("../common/api"), exports);
var Files;
(function (Files) {
    Files.uriToFilePath = fm.uriToFilePath;
    Files.resolveGlobalNodePath = fm.resolveGlobalNodePath;
    Files.resolveGlobalYarnPath = fm.resolveGlobalYarnPath;
    Files.resolve = fm.resolve;
    Files.resolveModulePath = fm.resolveModulePath;
})(Files || (exports.Files = Files = {}));
let _protocolConnection;
function endProtocolConnection() {
    if (_protocolConnection === undefined) {
        return;
    }
    try {
        _protocolConnection.end();
    }
    catch (_err) {
        // Ignore. The client process could have already
        // did and we can't send an end into the connection.
    }
}
let _shutdownReceived = false;
let exitTimer = undefined;
function setupExitTimer() {
    const argName = '--clientProcessId';
    function runTimer(value) {
        try {
            let processId = parseInt(value);
            if (!isNaN(processId)) {
                exitTimer = setInterval(() => {
                    try {
                        process.kill(processId, 0);
                    }
                    catch (ex) {
                        // Parent process doesn't exist anymore. Exit the server.
                        endProtocolConnection();
                        process.exit(_shutdownReceived ? 0 : 1);
                    }
                }, 3000);
            }
        }
        catch (e) {
            // Ignore errors;
        }
    }
    for (let i = 2; i < process.argv.length; i++) {
        let arg = process.argv[i];
        if (arg === argName && i + 1 < process.argv.length) {
            runTimer(process.argv[i + 1]);
            return;
        }
        else {
            let args = arg.split('=');
            if (args[0] === argName) {
                runTimer(args[1]);
            }
        }
    }
}
setupExitTimer();
const watchDog = {
    initialize: (params) => {
        const processId = params.processId;
        if (Is.number(processId) && exitTimer === undefined) {
            // We received a parent process id. Set up a timer to periodically check
            // if the parent is still alive.
            setInterval(() => {
                try {
                    process.kill(processId, 0);
                }
                catch (ex) {
                    // Parent process doesn't exist anymore. Exit the server.
                    process.exit(_shutdownReceived ? 0 : 1);
                }
            }, 3000);
        }
    },
    get shutdownReceived() {
        return _shutdownReceived;
    },
    set shutdownReceived(value) {
        _shutdownReceived = value;
    },
    exit: (code) => {
        endProtocolConnection();
        process.exit(code);
    }
};
function createConnection(arg1, arg2, arg3, arg4) {
    let factories;
    let input;
    let output;
    let options;
    if (arg1 !== void 0 && arg1.__brand === 'features') {
        factories = arg1;
        arg1 = arg2;
        arg2 = arg3;
        arg3 = arg4;
    }
    if (node_1.ConnectionStrategy.is(arg1) || node_1.ConnectionOptions.is(arg1)) {
        options = arg1;
    }
    else {
        input = arg1;
        output = arg2;
        options = arg3;
    }
    return _createConnection(input, output, options, factories);
}
exports.createConnection = createConnection;
function _createConnection(input, output, options, factories) {
    let stdio = false;
    if (!input && !output && process.argv.length > 2) {
        let port = void 0;
        let pipeName = void 0;
        let argv = process.argv.slice(2);
        for (let i = 0; i < argv.length; i++) {
            let arg = argv[i];
            if (arg === '--node-ipc') {
                input = new node_1.IPCMessageReader(process);
                output = new node_1.IPCMessageWriter(process);
                break;
            }
            else if (arg === '--stdio') {
                stdio = true;
                input = process.stdin;
                output = process.stdout;
                break;
            }
            else if (arg === '--socket') {
                port = parseInt(argv[i + 1]);
                break;
            }
            else if (arg === '--pipe') {
                pipeName = argv[i + 1];
                break;
            }
            else {
                var args = arg.split('=');
                if (args[0] === '--socket') {
                    port = parseInt(args[1]);
                    break;
                }
                else if (args[0] === '--pipe') {
                    pipeName = args[1];
                    break;
                }
            }
        }
        if (port) {
            let transport = (0, node_1.createServerSocketTransport)(port);
            input = transport[0];
            output = transport[1];
        }
        else if (pipeName) {
            let transport = (0, node_1.createServerPipeTransport)(pipeName);
            input = transport[0];
            output = transport[1];
        }
    }
    var commandLineMessage = 'Use arguments of createConnection or set command line parameters: \'--node-ipc\', \'--stdio\' or \'--socket={number}\'';
    if (!input) {
        throw new Error('Connection input stream is not set. ' + commandLineMessage);
    }
    if (!output) {
        throw new Error('Connection output stream is not set. ' + commandLineMessage);
    }
    // Backwards compatibility
    if (Is.func(input.read) && Is.func(input.on)) {
        let inputStream = input;
        inputStream.on('end', () => {
            endProtocolConnection();
            process.exit(_shutdownReceived ? 0 : 1);
        });
        inputStream.on('close', () => {
            endProtocolConnection();
            process.exit(_shutdownReceived ? 0 : 1);
        });
    }
    const connectionFactory = (logger) => {
        const result = (0, node_1.createProtocolConnection)(input, output, logger, options);
        if (stdio) {
            patchConsole(logger);
        }
        return result;
    };
    return (0, server_1.createConnection)(connectionFactory, watchDog, factories);
}
function patchConsole(logger) {
    function serialize(args) {
        return args.map(arg => typeof arg === 'string' ? arg : (0, node_util_1.inspect)(arg)).join(' ');
    }
    const counters = new Map();
    console.assert = function assert(assertion, ...args) {
        if (assertion) {
            return;
        }
        if (args.length === 0) {
            logger.error('Assertion failed');
        }
        else {
            const [message, ...rest] = args;
            logger.error(`Assertion failed: ${message} ${serialize(rest)}`);
        }
    };
    console.count = function count(label = 'default') {
        const message = String(label);
        let counter = counters.get(message) ?? 0;
        counter += 1;
        counters.set(message, counter);
        logger.log(`${message}: ${message}`);
    };
    console.countReset = function countReset(label) {
        if (label === undefined) {
            counters.clear();
        }
        else {
            counters.delete(String(label));
        }
    };
    console.debug = function debug(...args) {
        logger.log(serialize(args));
    };
    console.dir = function dir(arg, options) {
        // @ts-expect-error https://github.com/DefinitelyTyped/DefinitelyTyped/pull/66626
        logger.log((0, node_util_1.inspect)(arg, options));
    };
    console.log = function log(...args) {
        logger.log(serialize(args));
    };
    console.error = function error(...args) {
        logger.error(serialize(args));
    };
    console.trace = function trace(...args) {
        const stack = new Error().stack.replace(/(.+\n){2}/, '');
        let message = 'Trace';
        if (args.length !== 0) {
            message += `: ${serialize(args)}`;
        }
        logger.log(`${message}\n${stack}`);
    };
    console.warn = function warn(...args) {
        logger.warn(serialize(args));
    };
}
