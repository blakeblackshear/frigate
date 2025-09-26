"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const theme_common_1 = require("@docusaurus/theme-common");
const useIsBrowser_1 = __importDefault(require("@docusaurus/useIsBrowser"));
const error_message_1 = require("@hookform/error-message");
const slice_1 = require("@theme/ApiExplorer/Body/slice");
const clsx_1 = __importDefault(require("clsx"));
const react_hook_form_1 = require("react-hook-form");
const react_live_1 = require("react-live");
function Live({ onEdit, showErrors }) {
  const isBrowser = (0, useIsBrowser_1.default)();
  const [editorDisabled, setEditorDisabled] = (0, react_1.useState)(false);
  return react_1.default.createElement(
    "div",
    {
      onClick: () => setEditorDisabled(false),
      onBlur: () => setEditorDisabled(true),
    },
    react_1.default.createElement(react_live_1.LiveEditor, {
      key: String(isBrowser),
      className: (0, clsx_1.default)({
        "openapi-explorer__playground-editor": true,
        "openapi-explorer__form-item-input": showErrors,
        error: showErrors,
      }),
      onChange: onEdit,
      disabled: editorDisabled,
      tabMode: "focus",
    })
  );
}
const LiveComponent = (0, react_live_1.withLive)(Live);
function App({
  children,
  transformCode,
  value,
  language,
  action,
  required: isRequired,
  ...props
}) {
  const prismTheme = (0, theme_common_1.usePrismTheme)();
  const [code, setCode] = react_1.default.useState(children.replace(/\n$/, ""));
  (0, react_1.useEffect)(() => {
    action((0, slice_1.setStringRawBody)(code));
  }, [action, code]);
  const {
    control,
    formState: { errors },
  } = (0, react_hook_form_1.useFormContext)();
  const showErrorMessage = errors?.requestBody;
  const handleChange = (snippet, onChange) => {
    setCode(snippet);
    onChange(snippet);
  };
  return react_1.default.createElement(
    "div",
    {
      className: (0, clsx_1.default)({
        "openapi-explorer__playground-container": true,
      }),
    },
    react_1.default.createElement(
      react_live_1.LiveProvider,
      {
        code: code,
        transformCode: transformCode ?? ((code) => `${code};`),
        theme: prismTheme,
        language: language,
        ...props,
      },
      react_1.default.createElement(react_hook_form_1.Controller, {
        control: control,
        rules: {
          required: isRequired && !code ? "This field is required" : false,
        },
        name: "requestBody",
        render: ({ field: { onChange, name } }) =>
          react_1.default.createElement(LiveComponent, {
            onEdit: (e) => handleChange(e, onChange),
            name: name,
            showErrors: showErrorMessage,
          }),
      }),
      showErrorMessage &&
        react_1.default.createElement(error_message_1.ErrorMessage, {
          errors: errors,
          name: "requestBody",
          render: ({ message }) =>
            react_1.default.createElement(
              "div",
              { className: "openapi-explorer__input-error" },
              message
            ),
        })
    )
  );
}
const LiveApp = (0, react_live_1.withLive)(App);
exports.default = LiveApp;
