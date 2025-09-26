"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault")["default"];

exports.__esModule = true;
exports["default"] = exports.ReactReduxContext = void 0;

var _react = _interopRequireDefault(require("react"));

var ReactReduxContext = /*#__PURE__*/_react["default"].createContext(null);

exports.ReactReduxContext = ReactReduxContext;

if (process.env.NODE_ENV !== 'production') {
  ReactReduxContext.displayName = 'ReactRedux';
}

var _default = ReactReduxContext;
exports["default"] = _default;