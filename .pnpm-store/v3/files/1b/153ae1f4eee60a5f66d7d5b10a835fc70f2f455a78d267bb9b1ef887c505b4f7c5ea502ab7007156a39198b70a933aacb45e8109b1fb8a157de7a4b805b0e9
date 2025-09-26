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
const FormTextInput_1 = __importDefault(
  require("@theme/ApiExplorer/FormTextInput")
);
const hooks_1 = require("@theme/ApiItem/hooks");
const slice_1 = require("./slice");
function Authorization() {
  const data = (0, hooks_1.useTypedSelector)((state) => state.auth.data);
  const options = (0, hooks_1.useTypedSelector)((state) => state.auth.options);
  const selected = (0, hooks_1.useTypedSelector)(
    (state) => state.auth.selected
  );
  const dispatch = (0, hooks_1.useTypedDispatch)();
  if (selected === undefined) {
    return null;
  }
  const selectedAuth = options[selected];
  const optionKeys = Object.keys(options);
  return react_1.default.createElement(
    "div",
    null,
    optionKeys.length > 1 &&
      react_1.default.createElement(
        FormItem_1.default,
        { label: "Security Scheme" },
        react_1.default.createElement(FormSelect_1.default, {
          options: optionKeys,
          value: selected,
          onChange: (e) => {
            dispatch((0, slice_1.setSelectedAuth)(e.target.value));
          },
        })
      ),
    selectedAuth.map((a) => {
      if (a.type === "http" && a.scheme === "bearer") {
        return react_1.default.createElement(
          FormItem_1.default,
          { label: "Bearer Token", key: a.key + "-bearer" },
          react_1.default.createElement(FormTextInput_1.default, {
            placeholder: "Bearer Token",
            password: true,
            value: data[a.key].token ?? "",
            onChange: (e) => {
              const value = e.target.value;
              dispatch(
                (0, slice_1.setAuthData)({
                  scheme: a.key,
                  key: "token",
                  value: value ? value : undefined,
                })
              );
            },
          })
        );
      }
      if (a.type === "oauth2") {
        return react_1.default.createElement(
          FormItem_1.default,
          { label: "Bearer Token", key: a.key + "-oauth2" },
          react_1.default.createElement(FormTextInput_1.default, {
            placeholder: "Bearer Token",
            password: true,
            value: data[a.key].token ?? "",
            onChange: (e) => {
              const value = e.target.value;
              dispatch(
                (0, slice_1.setAuthData)({
                  scheme: a.key,
                  key: "token",
                  value: value ? value : undefined,
                })
              );
            },
          })
        );
      }
      if (a.type === "http" && a.scheme === "basic") {
        return react_1.default.createElement(
          react_1.default.Fragment,
          { key: a.key + "-basic" },
          react_1.default.createElement(
            FormItem_1.default,
            { label: "Username" },
            react_1.default.createElement(FormTextInput_1.default, {
              placeholder: "Username",
              value: data[a.key].username ?? "",
              onChange: (e) => {
                const value = e.target.value;
                dispatch(
                  (0, slice_1.setAuthData)({
                    scheme: a.key,
                    key: "username",
                    value: value ? value : undefined,
                  })
                );
              },
            })
          ),
          react_1.default.createElement(
            FormItem_1.default,
            { label: "Password" },
            react_1.default.createElement(FormTextInput_1.default, {
              placeholder: "Password",
              password: true,
              value: data[a.key].password ?? "",
              onChange: (e) => {
                const value = e.target.value;
                dispatch(
                  (0, slice_1.setAuthData)({
                    scheme: a.key,
                    key: "password",
                    value: value ? value : undefined,
                  })
                );
              },
            })
          )
        );
      }
      if (a.type === "apiKey") {
        return react_1.default.createElement(
          FormItem_1.default,
          { label: `${a.key}`, key: a.key + "-apikey" },
          react_1.default.createElement(FormTextInput_1.default, {
            placeholder: `${a.key}`,
            password: true,
            value: data[a.key].apiKey ?? "",
            onChange: (e) => {
              const value = e.target.value;
              dispatch(
                (0, slice_1.setAuthData)({
                  scheme: a.key,
                  key: "apiKey",
                  value: value ? value : undefined,
                })
              );
            },
          })
        );
      }
      return null;
    })
  );
}
exports.default = Authorization;
