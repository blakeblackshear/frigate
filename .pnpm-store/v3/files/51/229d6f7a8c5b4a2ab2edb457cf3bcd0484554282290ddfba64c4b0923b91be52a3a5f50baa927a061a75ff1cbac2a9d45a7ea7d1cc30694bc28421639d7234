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
const FormItem_1 = __importDefault(require("@theme/ApiExplorer/FormItem"));
const ParamArrayFormItem_1 = __importDefault(
  require("@theme/ApiExplorer/ParamOptions/ParamFormItems/ParamArrayFormItem")
);
const ParamBooleanFormItem_1 = __importDefault(
  require("@theme/ApiExplorer/ParamOptions/ParamFormItems/ParamBooleanFormItem")
);
const ParamMultiSelectFormItem_1 = __importDefault(
  require("@theme/ApiExplorer/ParamOptions/ParamFormItems/ParamMultiSelectFormItem")
);
const ParamSelectFormItem_1 = __importDefault(
  require("@theme/ApiExplorer/ParamOptions/ParamFormItems/ParamSelectFormItem")
);
const ParamTextFormItem_1 = __importDefault(
  require("@theme/ApiExplorer/ParamOptions/ParamFormItems/ParamTextFormItem")
);
const hooks_1 = require("@theme/ApiItem/hooks");
function ParamOption({ param }) {
  if (param.schema?.type === "array" && param.schema.items?.enum) {
    return react_1.default.createElement(ParamMultiSelectFormItem_1.default, {
      param: param,
    });
  }
  if (param.schema?.type === "array") {
    return react_1.default.createElement(ParamArrayFormItem_1.default, {
      param: param,
    });
  }
  if (param.schema?.enum) {
    return react_1.default.createElement(ParamSelectFormItem_1.default, {
      param: param,
    });
  }
  if (param.schema?.type === "boolean") {
    return react_1.default.createElement(ParamBooleanFormItem_1.default, {
      param: param,
    });
  }
  // integer, number, string, int32, int64, float, double, object, byte, binary,
  // date-time, date, password
  return react_1.default.createElement(ParamTextFormItem_1.default, {
    param: param,
  });
}
function ParamOptionWrapper({ param }) {
  return react_1.default.createElement(
    FormItem_1.default,
    { label: param.name, type: param.in, required: param.required },
    react_1.default.createElement(ParamOption, { param: param })
  );
}
function ParamOptions() {
  const [showOptional, setShowOptional] = (0, react_1.useState)(false);
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
  const allParams = [
    ...pathParams,
    ...queryParams,
    ...cookieParams,
    ...headerParams,
  ];
  const requiredParams = allParams.filter((p) => p.required);
  const optionalParams = allParams.filter((p) => !p.required);
  return react_1.default.createElement(
    react_1.default.Fragment,
    null,
    requiredParams.map((param) =>
      react_1.default.createElement(ParamOptionWrapper, {
        key: `${param.in}-${param.name}`,
        param: param,
      })
    ),
    optionalParams.length > 0 &&
      react_1.default.createElement(
        react_1.default.Fragment,
        null,
        react_1.default.createElement(
          "button",
          {
            type: "button",
            className: "openapi-explorer__show-more-btn",
            onClick: () => setShowOptional((prev) => !prev),
          },
          react_1.default.createElement(
            "span",
            {
              style: {
                width: "1.5em",
                display: "inline-block",
                textAlign: "center",
              },
            },
            react_1.default.createElement(
              "span",
              {
                className: showOptional
                  ? "openapi-explorer__plus-btn--expanded"
                  : "openapi-explorer__plus-btn",
              },
              react_1.default.createElement(
                "div",
                null,
                react_1.default.createElement(
                  "svg",
                  {
                    style: {
                      fill: "currentColor",
                      width: "10px",
                      height: "10px",
                    },
                    height: "16",
                    viewBox: "0 0 16 16",
                    width: "16",
                    xmlns: "http://www.w3.org/2000/svg",
                  },
                  react_1.default.createElement("path", {
                    d: "M9 7h6a1 1 0 0 1 0 2H9v6a1 1 0 0 1-2 0V9H1a1 1 0 1 1 0-2h6V1a1 1 0 1 1 2 0z",
                    fillRule: "evenodd",
                  })
                )
              )
            )
          ),
          showOptional ? "Hide optional parameters" : "Show optional parameters"
        ),
        react_1.default.createElement(
          "div",
          {
            className: showOptional
              ? "openapi-explorer__show-options"
              : "openapi-explorer__hide-options",
          },
          optionalParams.map((param) =>
            react_1.default.createElement(ParamOptionWrapper, {
              key: `${param.in}-${param.name}`,
              param: param,
            })
          )
        )
      )
  );
}
exports.default = ParamOptions;
