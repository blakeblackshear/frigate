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
exports.default = CopyButton;
const react_1 = __importStar(require("react"));
const Translate_1 = require("@docusaurus/Translate");
const clsx_1 = __importDefault(require("clsx"));
const copy_text_to_clipboard_1 = __importDefault(
  require("copy-text-to-clipboard")
);
function CopyButton({ code, className }) {
  const [isCopied, setIsCopied] = (0, react_1.useState)(false);
  const copyTimeout = (0, react_1.useRef)(undefined);
  const handleCopyCode = (0, react_1.useCallback)(() => {
    (0, copy_text_to_clipboard_1.default)(code);
    setIsCopied(true);
    copyTimeout.current = window.setTimeout(() => {
      setIsCopied(false);
    }, 1000);
  }, [code]);
  (0, react_1.useEffect)(
    () => () => window.clearTimeout(copyTimeout.current),
    []
  );
  return react_1.default.createElement(
    "button",
    {
      type: "button",
      "aria-label": isCopied
        ? (0, Translate_1.translate)({
            id: "theme.CodeBlock.copied",
            message: "Copied",
            description: "The copied button label on code blocks",
          })
        : (0, Translate_1.translate)({
            id: "theme.CodeBlock.copyButtonAriaLabel",
            message: "Copy code to clipboard",
            description: "The ARIA label for copy code blocks button",
          }),
      title: (0, Translate_1.translate)({
        id: "theme.CodeBlock.copy",
        message: "Copy",
        description: "The copy button label on code blocks",
      }),
      className: (0, clsx_1.default)(
        "clean-btn",
        className,
        "openapi-explorer__code-block-copy-btn",
        isCopied && "openapi-explorer__code-block-copy-btn--copied"
      ),
      onClick: handleCopyCode,
    },
    react_1.default.createElement(
      "span",
      {
        className: "openapi-explorer__code-block-copy-btn-icons",
        "aria-hidden": "true",
      },
      react_1.default.createElement(
        "svg",
        {
          className: "openapi-explorer__code-block-copy-btn-icon",
          viewBox: "0 0 24 24",
        },
        react_1.default.createElement("path", {
          d: "M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z",
        })
      ),
      react_1.default.createElement(
        "svg",
        {
          className: "openapi-explorer__code-block-copy-btn-icon--success",
          viewBox: "0 0 24 24",
        },
        react_1.default.createElement("path", {
          d: "M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",
        })
      )
    )
  );
}
