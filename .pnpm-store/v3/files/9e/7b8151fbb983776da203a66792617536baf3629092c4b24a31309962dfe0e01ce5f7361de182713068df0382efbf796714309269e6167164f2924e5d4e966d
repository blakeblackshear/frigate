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
exports.default = ParamMultiSelectFormItem;
const react_1 = __importDefault(require("react"));
const error_message_1 = require("@hookform/error-message");
const FormMultiSelect_1 = __importDefault(
  require("@theme/ApiExplorer/FormMultiSelect")
);
const slice_1 = require("@theme/ApiExplorer/ParamOptions/slice");
const hooks_1 = require("@theme/ApiItem/hooks");
const react_hook_form_1 = require("react-hook-form");
function ParamMultiSelectFormItem({ param }) {
  const {
    control,
    formState: { errors },
  } = (0, react_hook_form_1.useFormContext)();
  const showErrorMessage = errors?.paramMultiSelect;
  const dispatch = (0, hooks_1.useTypedDispatch)();
  const options = param.schema?.items?.enum ?? [];
  const pathParams = (0, hooks_1.useTypedSelector)(
    (state) => state.params.path
  );
  const queryParams = (0, hooks_1.useTypedSelector)(
    (state) => state.params.query
  );
  const cookieParams = (0, hooks_1.useTypedSelector)(
    (state) => state.params.cookie
  );
  const headerParams = (0, hooks_1.useTypedSelector)(
    (state) => state.params.header
  );
  const paramTypeToWatch = pathParams.length
    ? pathParams
    : queryParams.length
      ? queryParams
      : cookieParams.length
        ? cookieParams
        : headerParams;
  const handleChange = (e, onChange) => {
    const values = Array.prototype.filter
      .call(e.target.options, (o) => o.selected)
      .map((o) => o.value);
    dispatch(
      (0, slice_1.setParam)({
        ...param,
        value: values.length > 0 ? values : undefined,
      })
    );
    onChange(paramTypeToWatch);
  };
  return react_1.default.createElement(
    react_1.default.Fragment,
    null,
    react_1.default.createElement(react_hook_form_1.Controller, {
      control: control,
      rules: { required: param.required ? "This field is required" : false },
      name: "paramMultiSelect",
      render: ({ field: { onChange, name } }) =>
        react_1.default.createElement(FormMultiSelect_1.default, {
          options: options,
          name: name,
          onChange: (e) => handleChange(e, onChange),
          showErrors: showErrorMessage,
        }),
    }),
    showErrorMessage &&
      react_1.default.createElement(error_message_1.ErrorMessage, {
        errors: errors,
        name: "paramMultiSelect",
        render: ({ message }) =>
          react_1.default.createElement(
            "div",
            { className: "openapi-explorer__input-error" },
            message
          ),
      })
  );
}
