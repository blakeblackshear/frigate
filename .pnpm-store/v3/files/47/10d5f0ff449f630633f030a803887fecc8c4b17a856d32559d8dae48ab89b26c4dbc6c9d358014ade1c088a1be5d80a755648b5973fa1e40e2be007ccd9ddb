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
exports.ProposedFeatures = exports.NotebookDocuments = exports.TextDocuments = exports.SemanticTokensBuilder = void 0;
const semanticTokens_1 = require("./semanticTokens");
Object.defineProperty(exports, "SemanticTokensBuilder", { enumerable: true, get: function () { return semanticTokens_1.SemanticTokensBuilder; } });
const ic = require("./inlineCompletion.proposed");
__exportStar(require("vscode-languageserver-protocol/"), exports);
const textDocuments_1 = require("./textDocuments");
Object.defineProperty(exports, "TextDocuments", { enumerable: true, get: function () { return textDocuments_1.TextDocuments; } });
const notebook_1 = require("./notebook");
Object.defineProperty(exports, "NotebookDocuments", { enumerable: true, get: function () { return notebook_1.NotebookDocuments; } });
__exportStar(require("./server"), exports);
var ProposedFeatures;
(function (ProposedFeatures) {
    ProposedFeatures.all = {
        __brand: 'features',
        languages: ic.InlineCompletionFeature
    };
})(ProposedFeatures || (exports.ProposedFeatures = ProposedFeatures = {}));
