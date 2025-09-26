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
exports.default = ParamBooleanFormItem;
const react_1 = __importDefault(require("react"));
const error_message_1 = require("@hookform/error-message");
const FormSelect_1 = __importDefault(require("@theme/ApiExplorer/FormSelect"));
const slice_1 = require("@theme/ApiExplorer/ParamOptions/slice");
const hooks_1 = require("@theme/ApiItem/hooks");
const react_hook_form_1 = require("react-hook-form");
function ParamBooleanFormItem({ param }) {
  const dispatch = (0, hooks_1.useTypedDispatch)();
  const {
    control,
    formState: { errors },
  } = (0, react_hook_form_1.useFormContext)();
  const showErrorMessage = errors?.paramBoolean;
  return react_1.default.createElement(
    react_1.default.Fragment,
    null,
    react_1.default.createElement(react_hook_form_1.Controller, {
      control: control,
      rules: { required: param.required ? "This field is required" : false },
      name: "paramBoolean",
      render: ({ field: { onChange, name } }) =>
        react_1.default.createElement(FormSelect_1.default, {
          name: name,
          options: ["---", "true", "false"],
          onChange: (e) => {
            const val = e.target.value;
            dispatch(
              (0, slice_1.setParam)({
                ...param,
                value: val === "---" ? undefined : val,
              })
            );
            onChange(val);
          },
        }),
    }),
    showErrorMessage &&
      react_1.default.createElement(error_message_1.ErrorMessage, {
        errors: errors,
        name: "paramBoolean",
        render: ({ message }) =>
          react_1.default.createElement(
            "div",
            { className: "openapi-explorer__input-error" },
            message
          ),
      })
  );
}
