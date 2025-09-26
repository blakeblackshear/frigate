"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const FormItem_1 = __importDefault(require("@theme/ApiExplorer/FormItem"));
const FormSelect_1 = __importDefault(require("@theme/ApiExplorer/FormSelect"));
const hooks_1 = require("@theme/ApiItem/hooks");
const slice_1 = require("./slice");
function Accept() {
  const value = (0, hooks_1.useTypedSelector)((state) => state.accept.value);
  const options = (0, hooks_1.useTypedSelector)(
    (state) => state.accept.options
  );
  const dispatch = (0, hooks_1.useTypedDispatch)();
  if (options.length <= 1) {
    return null;
  }
  return react_1.default.createElement(
    FormItem_1.default,
    { label: "Accept" },
    react_1.default.createElement(FormSelect_1.default, {
      value: value,
      options: options,
      onChange: (e) => dispatch((0, slice_1.setAccept)(e.target.value)),
    })
  );
}
exports.default = Accept;
