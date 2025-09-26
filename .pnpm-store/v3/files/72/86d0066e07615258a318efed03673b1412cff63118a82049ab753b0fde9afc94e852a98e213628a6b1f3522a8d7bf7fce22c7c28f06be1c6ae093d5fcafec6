"use strict";
/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox, Microsoft and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_jsonrpc_1 = require("vscode-jsonrpc");
const messages_1 = require("./messages");
const api_1 = require("./api");
// This file is used to define the $ notification partly specified in JSON-RPC
// so that we generate proper data for them in the meta model.
// @ts-ignore 6196
var SetTraceNotification;
(function (SetTraceNotification) {
    SetTraceNotification.method = '$/setTrace';
    SetTraceNotification.messageDirection = messages_1.MessageDirection.clientToServer;
    SetTraceNotification.type = new messages_1.ProtocolNotificationType(SetTraceNotification.method);
})(SetTraceNotification || (SetTraceNotification = {}));
// @ts-ignore 6196
var LogTraceNotification;
(function (LogTraceNotification) {
    LogTraceNotification.method = '$/logTrace';
    LogTraceNotification.messageDirection = messages_1.MessageDirection.serverToClient;
    LogTraceNotification.type = new messages_1.ProtocolNotificationType(LogTraceNotification.method);
})(LogTraceNotification || (LogTraceNotification = {}));
// @ts-ignore 6196
const $ErrorCodes = vscode_jsonrpc_1.ErrorCodes;
// @ts-ignore 6196
const $LSPErrorCodes = api_1.LSPErrorCodes;
// @ts-ignore 6196
var CancelNotification;
(function (CancelNotification) {
    CancelNotification.method = '$/cancelRequest';
    CancelNotification.messageDirection = messages_1.MessageDirection.both;
    CancelNotification.type = new messages_1.ProtocolNotificationType(CancelNotification.method);
})(CancelNotification || (CancelNotification = {}));
// @ts-ignore 6196
var ProgressNotification;
(function (ProgressNotification) {
    ProgressNotification.method = '$/progress';
    ProgressNotification.messageDirection = messages_1.MessageDirection.both;
    ProgressNotification.type = new messages_1.ProtocolNotificationType(ProgressNotification.method);
})(ProgressNotification || (ProgressNotification = {}));
