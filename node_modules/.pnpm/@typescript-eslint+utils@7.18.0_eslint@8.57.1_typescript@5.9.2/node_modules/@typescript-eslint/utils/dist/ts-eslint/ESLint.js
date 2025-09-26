"use strict";
/* eslint-disable @typescript-eslint/no-namespace */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyESLint = exports.FlatESLint = exports.ESLint = void 0;
var LegacyESLint_1 = require("./eslint/LegacyESLint");
// TODO - remove this in the next major
/**
 * @deprecated - use FlatESLint or LegacyESLint instead
 */
Object.defineProperty(exports, "ESLint", { enumerable: true, get: function () { return LegacyESLint_1.LegacyESLint; } });
var FlatESLint_1 = require("./eslint/FlatESLint");
Object.defineProperty(exports, "FlatESLint", { enumerable: true, get: function () { return FlatESLint_1.FlatESLint; } });
var LegacyESLint_2 = require("./eslint/LegacyESLint");
Object.defineProperty(exports, "LegacyESLint", { enumerable: true, get: function () { return LegacyESLint_2.LegacyESLint; } });
//# sourceMappingURL=ESLint.js.map