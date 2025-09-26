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
// @ts-nocheck
const react_1 = __importDefault(require("react"));
const error_message_1 = require("@hookform/error-message");
const clsx_1 = __importDefault(require("clsx"));
const react_hook_form_1 = require("react-hook-form");
function FormTextInput({
  isRequired,
  value,
  placeholder,
  password,
  onChange,
  paramName,
}) {
  placeholder = placeholder?.split("\n")[0];
  const {
    register,
    formState: { errors },
  } = (0, react_hook_form_1.useFormContext)();
  const showErrorMessage = errors?.[paramName]?.message;
  return react_1.default.createElement(
    react_1.default.Fragment,
    null,
    paramName
      ? react_1.default.createElement("input", {
          ...register(paramName, {
            required: isRequired ? "This field is required" : false,
          }),
          className: (0, clsx_1.default)("openapi-explorer__form-item-input", {
            error: showErrorMessage,
          }),
          type: password ? "password" : "text",
          placeholder: placeholder,
          title: placeholder,
          value: value,
          onChange: onChange,
          autoComplete: "off",
        })
      : react_1.default.createElement("input", {
          className: "openapi-explorer__form-item-input",
          type: password ? "password" : "text",
          placeholder: placeholder,
          title: placeholder,
          value: value,
          onChange: onChange,
          autoComplete: "off",
        }),
    showErrorMessage &&
      react_1.default.createElement(error_message_1.ErrorMessage, {
        errors: errors,
        name: paramName,
        render: ({ message }) =>
          react_1.default.createElement(
            "div",
            { className: "openapi-explorer__input-error" },
            message
          ),
      })
  );
}
exports.default = FormTextInput;
