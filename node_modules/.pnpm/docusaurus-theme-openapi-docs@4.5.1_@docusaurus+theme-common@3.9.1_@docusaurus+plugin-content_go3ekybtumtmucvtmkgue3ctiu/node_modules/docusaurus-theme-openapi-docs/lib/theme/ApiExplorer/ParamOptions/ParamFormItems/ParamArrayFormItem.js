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
exports.default = ParamArrayFormItem;
const react_1 = __importStar(require("react"));
const error_message_1 = require("@hookform/error-message");
const toolkit_1 = require("@reduxjs/toolkit");
const FormSelect_1 = __importDefault(require("@theme/ApiExplorer/FormSelect"));
const FormTextInput_1 = __importDefault(
  require("@theme/ApiExplorer/FormTextInput")
);
const slice_1 = require("@theme/ApiExplorer/ParamOptions/slice");
const hooks_1 = require("@theme/ApiItem/hooks");
const react_hook_form_1 = require("react-hook-form");
function ArrayItem({ param, onChange, initialValue }) {
  const [value, setValue] = (0, react_1.useState)(initialValue || "");
  if (param.schema?.items?.type === "boolean") {
    return react_1.default.createElement(FormSelect_1.default, {
      options: ["---", "true", "false"],
      onChange: (e) => {
        const val = e.target.value;
        onChange(val === "---" ? undefined : val);
      },
    });
  }
  return react_1.default.createElement(FormTextInput_1.default, {
    placeholder: param.description || param.name,
    value: value,
    onChange: (e) => {
      setValue(e.target.value);
      onChange(e.target.value);
    },
  });
}
function ParamArrayFormItem({ param }) {
  const [items, setItems] = (0, react_1.useState)([]);
  const dispatch = (0, hooks_1.useTypedDispatch)();
  const {
    control,
    formState: { errors },
  } = (0, react_hook_form_1.useFormContext)();
  const showErrorMessage = errors?.paramArray?.message;
  function handleAddItem(e) {
    e.preventDefault(); // prevent form from submitting
    setItems((i) => [
      ...i,
      {
        id: (0, toolkit_1.nanoid)(),
      },
    ]);
  }
  (0, react_1.useEffect)(() => {
    const values = items.map((item) => item.value).filter((item) => !!item);
    dispatch(
      (0, slice_1.setParam)({
        ...param,
        value: values.length > 0 ? values : undefined,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);
  (0, react_1.useEffect)(() => {
    if (param.schema?.example?.length > 0) {
      const examplesWithIds = param.schema.example.map((item) => ({
        id: (0, toolkit_1.nanoid)(),
        value: item.toString(),
      }));
      setItems(examplesWithIds);
    }
  }, [param.schema.example, param.schema.length]);
  function handleDeleteItem(itemToDelete) {
    return () => {
      const newItems = items.filter((i) => i.id !== itemToDelete.id);
      setItems(newItems);
    };
  }
  function handleChangeItem(itemToUpdate, onChange) {
    return (value) => {
      const newItems = items.map((i) => {
        if (i.id === itemToUpdate.id) {
          return { ...i, value: value };
        }
        return i;
      });
      setItems(newItems);
      onChange(newItems);
    };
  }
  return react_1.default.createElement(
    react_1.default.Fragment,
    null,
    react_1.default.createElement(react_hook_form_1.Controller, {
      control: control,
      rules: { required: param.required ? "This field is required" : false },
      name: "paramArray",
      render: ({ field: { onChange, name } }) =>
        react_1.default.createElement(
          react_1.default.Fragment,
          null,
          items.map((item) =>
            react_1.default.createElement(
              "div",
              { key: item.id, style: { display: "flex" } },
              react_1.default.createElement(ArrayItem, {
                param: param,
                onChange: handleChangeItem(item, onChange),
                initialValue: item.value,
              }),
              react_1.default.createElement(
                "button",
                {
                  className: "openapi-explorer__delete-btn",
                  onClick: handleDeleteItem(item),
                },
                react_1.default.createElement(
                  "svg",
                  {
                    focusable: "false",
                    preserveAspectRatio: "xMidYMid meet",
                    xmlns: "http://www.w3.org/2000/svg",
                    fill: "currentColor",
                    width: "16",
                    height: "16",
                    viewBox: "0 0 32 32",
                    "aria-hidden": "true",
                  },
                  react_1.default.createElement("path", {
                    d: "M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6 17.4 16 24 9.4z",
                  }),
                  react_1.default.createElement("title", null, "Delete")
                )
              )
            )
          ),
          react_1.default.createElement(
            "button",
            { className: "openapi-explorer__thin-btn", onClick: handleAddItem },
            "Add item"
          )
        ),
    }),
    showErrorMessage &&
      react_1.default.createElement(error_message_1.ErrorMessage, {
        errors: errors,
        name: "paramArray",
        render: ({ message }) =>
          react_1.default.createElement(
            "div",
            { className: "openapi-explorer__input-error" },
            message
          ),
      })
  );
}
