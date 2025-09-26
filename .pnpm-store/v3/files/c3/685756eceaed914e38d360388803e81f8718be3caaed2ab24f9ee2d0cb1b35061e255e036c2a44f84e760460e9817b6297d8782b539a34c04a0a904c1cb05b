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
const FloatingButton_1 = __importDefault(
  require("@theme/ApiExplorer/FloatingButton")
);
const react_magic_dropzone_1 = __importDefault(require("react-magic-dropzone"));
function RenderPreview({ file }) {
  switch (file.type) {
    case "image/png":
    case "image/jpeg":
    case "image/jpg":
    case "image/svg+xml":
      return react_1.default.createElement("img", {
        style: {
          borderRadius: "4px",
        },
        src: file.preview,
        alt: "",
      });
    default:
      return react_1.default.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            minWidth: 0,
          },
        },
        react_1.default.createElement(
          "svg",
          { viewBox: "0 0 100 120", style: { width: "50px", height: "60px" } },
          react_1.default.createElement("path", {
            fillRule: "evenodd",
            fill: "#b3beca",
            d: "M100.000,39.790 L100.000,105.000 C100.000,113.284 93.284,120.000 85.000,120.000 L15.000,120.000 C6.716,120.000 -0.000,113.284 -0.000,105.000 L-0.000,15.000 C-0.000,6.716 6.716,-0.000 15.000,-0.000 L60.210,-0.000 L100.000,39.790 Z",
          }),
          react_1.default.createElement("path", {
            fillRule: "evenodd",
            fill: "#90a1b1",
            transform: "translate(60, 0)",
            d: "M0.210,-0.000 L40.000,39.790 L40.000,40.000 L15.000,40.000 C6.716,40.000 0.000,33.284 0.000,25.000 L0.000,-0.000 L0.210,-0.000 Z",
          })
        ),
        react_1.default.createElement(
          "div",
          { className: "openapi-explorer__file-name" },
          file.name
        )
      );
  }
}
function FormFileUpload({ placeholder, onChange }) {
  const [hover, setHover] = (0, react_1.useState)(false);
  const [file, setFile] = (0, react_1.useState)();
  function setAndNotifyFile(file) {
    setFile(file);
    onChange?.(file);
  }
  function handleDrop(accepted) {
    const [file] = accepted;
    setAndNotifyFile(file);
    setHover(false);
  }
  return react_1.default.createElement(
    FloatingButton_1.default,
    null,
    react_1.default.createElement(
      react_magic_dropzone_1.default,
      {
        className: hover
          ? "openapi-explorer__dropzone-hover"
          : "openapi-explorer__dropzone",
        onDrop: handleDrop,
        onDragEnter: () => setHover(true),
        onDragLeave: () => setHover(false),
        multiple: false,
        style: { marginTop: "calc(var(--ifm-pre-padding) / 2)" },
      },
      file
        ? react_1.default.createElement(
            react_1.default.Fragment,
            null,
            react_1.default.createElement(
              "button",
              {
                style: { marginTop: "calc(var(--ifm-pre-padding) / 2)" },
                onClick: (e) => {
                  e.stopPropagation();
                  setAndNotifyFile(undefined);
                },
              },
              "Clear"
            ),
            react_1.default.createElement(RenderPreview, { file: file })
          )
        : react_1.default.createElement(
            "div",
            { className: "openapi-explorer__dropzone-content" },
            placeholder
          )
    )
  );
}
exports.default = FormFileUpload;
