/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.InlineCompletionFeature = void 0;
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const InlineCompletionFeature = (Base) => {
    return class extends Base {
        get inlineCompletion() {
            return {
                on: (handler) => {
                    return this.connection.onRequest(vscode_languageserver_protocol_1.InlineCompletionRequest.type, (params, cancel) => {
                        return handler(params, cancel, this.attachWorkDoneProgress(params));
                    });
                }
            };
        }
    };
};
exports.InlineCompletionFeature = InlineCompletionFeature;
