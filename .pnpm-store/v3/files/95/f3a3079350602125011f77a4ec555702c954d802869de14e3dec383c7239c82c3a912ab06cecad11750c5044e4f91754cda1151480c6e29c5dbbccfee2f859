"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.config = void 0;
var _padding = require("./utils/padding");
const config = exports.config = [{
  paddingType: _padding.PaddingType.Always,
  prevStatementType: _padding.StatementType.Any,
  nextStatementType: [_padding.StatementType.TestToken, _padding.StatementType.ItToken, _padding.StatementType.FitToken, _padding.StatementType.XitToken, _padding.StatementType.XtestToken]
}, {
  paddingType: _padding.PaddingType.Always,
  prevStatementType: [_padding.StatementType.TestToken, _padding.StatementType.ItToken, _padding.StatementType.FitToken, _padding.StatementType.XitToken, _padding.StatementType.XtestToken],
  nextStatementType: _padding.StatementType.Any
}];
var _default = exports.default = (0, _padding.createPaddingRule)(__filename, 'Enforce padding around `test` and `it` blocks', config);