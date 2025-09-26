"use strict";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
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
exports.createConnection = void 0;
const api_1 = require("../common/api");
__exportStar(require("vscode-languageserver-protocol/browser"), exports);
__exportStar(require("../common/api"), exports);
let _shutdownReceived = false;
const watchDog = {
    initialize: (_params) => {
    },
    get shutdownReceived() {
        return _shutdownReceived;
    },
    set shutdownReceived(value) {
        _shutdownReceived = value;
    },
    exit: (_code) => {
    }
};
function createConnection(arg1, arg2, arg3, arg4) {
    let factories;
    let reader;
    let writer;
    let options;
    if (arg1 !== void 0 && arg1.__brand === 'features') {
        factories = arg1;
        arg1 = arg2;
        arg2 = arg3;
        arg3 = arg4;
    }
    if (api_1.ConnectionStrategy.is(arg1) || api_1.ConnectionOptions.is(arg1)) {
        options = arg1;
    }
    else {
        reader = arg1;
        writer = arg2;
        options = arg3;
    }
    const connectionFactory = (logger) => {
        return (0, api_1.createProtocolConnection)(reader, writer, logger, options);
    };
    return (0, api_1.createConnection)(connectionFactory, watchDog, factories);
}
exports.createConnection = createConnection;
