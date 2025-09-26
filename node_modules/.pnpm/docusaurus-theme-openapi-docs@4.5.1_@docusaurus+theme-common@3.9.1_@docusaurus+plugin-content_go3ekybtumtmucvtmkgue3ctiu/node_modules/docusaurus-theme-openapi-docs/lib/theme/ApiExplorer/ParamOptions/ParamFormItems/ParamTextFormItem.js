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
exports.default = ParamTextFormItem;
const react_1 = __importDefault(require("react"));
const FormTextInput_1 = __importDefault(
  require("@theme/ApiExplorer/FormTextInput")
);
const slice_1 = require("@theme/ApiExplorer/ParamOptions/slice");
const hooks_1 = require("@theme/ApiItem/hooks");
function ParamTextFormItem({ param }) {
  const dispatch = (0, hooks_1.useTypedDispatch)();
  return react_1.default.createElement(FormTextInput_1.default, {
    isRequired: param.required,
    paramName: param.name,
    placeholder: param.description || param.name,
    onChange: (e) =>
      dispatch(
        (0, slice_1.setParam)({
          ...param,
          value:
            param.in === "path" || param.in === "query"
              ? e.target.value.replace(/\s/g, "%20")
              : e.target.value,
        })
      ),
  });
}
