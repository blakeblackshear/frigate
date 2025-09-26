/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.FoldingRangeFeature = void 0;
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const FoldingRangeFeature = (Base) => {
    return class extends Base {
        get foldingRange() {
            return {
                refresh: () => {
                    return this.connection.sendRequest(vscode_languageserver_protocol_1.FoldingRangeRefreshRequest.type);
                },
                on: (handler) => {
                    const type = vscode_languageserver_protocol_1.FoldingRangeRequest.type;
                    return this.connection.onRequest(type, (params, cancel) => {
                        return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
                    });
                }
            };
        }
    };
};
exports.FoldingRangeFeature = FoldingRangeFeature;
