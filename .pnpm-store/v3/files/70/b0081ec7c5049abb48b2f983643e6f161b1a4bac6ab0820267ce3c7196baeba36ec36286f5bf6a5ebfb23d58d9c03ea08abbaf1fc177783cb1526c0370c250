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
exports.default = ExpandButton;
const react_1 = __importStar(require("react"));
const theme_common_1 = require("@docusaurus/theme-common");
const Translate_1 = require("@docusaurus/Translate");
const Container_1 = __importDefault(
  require("@theme/ApiExplorer/ApiCodeBlock/Container")
);
const CopyButton_1 = __importDefault(
  require("@theme/ApiExplorer/ApiCodeBlock/CopyButton")
);
const ExitButton_1 = __importDefault(
  require("@theme/ApiExplorer/ApiCodeBlock/ExitButton")
);
const Line_1 = __importDefault(require("@theme/ApiExplorer/ApiCodeBlock/Line"));
const clsx_1 = __importDefault(require("clsx"));
const prism_react_renderer_1 = require("prism-react-renderer");
const react_modal_1 = __importDefault(require("react-modal"));
function ExpandButton({
  code,
  className,
  language,
  showLineNumbers,
  blockClassName,
  title,
  lineClassNames,
}) {
  const [isModalOpen, setIsModalOpen] = (0, react_1.useState)(false);
  const prismTheme = (0, theme_common_1.usePrismTheme)();
  (0, react_1.useEffect)(() => {
    react_modal_1.default.setAppElement("body");
  }, []);
  return react_1.default.createElement(
    react_1.default.Fragment,
    null,
    react_1.default.createElement(
      "button",
      {
        type: "button",
        "aria-label": isModalOpen
          ? (0, Translate_1.translate)({
              id: "theme.CodeBlock.expanded",
              message: "Expanded",
              description: "The expanded button label on code blocks",
            })
          : (0, Translate_1.translate)({
              id: "theme.CodeBlock.expandButtonAriaLabel",
              message: "Expand code to fullscreen",
              description: "The ARIA label for expand code blocks button",
            }),
        title: (0, Translate_1.translate)({
          id: "theme.CodeBlock.expand",
          message: "Expand",
          description: "The expand button label on code blocks",
        }),
        className: (0, clsx_1.default)(
          "clean-btn",
          className,
          "openapi-explorer__code-block-expand-btn",
          isModalOpen && "openapi-explorer__code-block-expand-btn--copied"
        ),
        onClick: () => setIsModalOpen(true),
      },
      react_1.default.createElement(
        "span",
        {
          className: "openapi-explorer__code-block-expand-btn-icons",
          "aria-hidden": "true",
        },
        react_1.default.createElement(
          "svg",
          {
            className: "openapi-explorer__code-block-expand-btn-icon",
            viewBox: "0 0 448 512",
          },
          react_1.default.createElement("path", {
            d: "M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H64V352zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H320zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H320c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V352z",
          })
        ),
        react_1.default.createElement(
          "svg",
          {
            className: "openapi-explorer__code-block-expand-btn-icon--success",
            viewBox: "0 0 24 24",
          },
          react_1.default.createElement("path", {
            d: "M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",
          })
        )
      )
    ),
    react_1.default.createElement(
      react_modal_1.default,
      {
        className: "openapi-explorer__expand-modal-content",
        overlayClassName: "openapi-explorer__expand-modal-overlay",
        isOpen: isModalOpen,
        onRequestClose: () => setIsModalOpen(false),
        contentLabel: "Code Snippet",
      },
      react_1.default.createElement(
        Container_1.default,
        {
          as: "div",
          className: (0, clsx_1.default)(
            "openapi-explorer__code-block-container",
            language &&
              !blockClassName.includes(`language-${language}`) &&
              `language-${language}`
          ),
        },
        title &&
          react_1.default.createElement(
            "div",
            { className: "openapi-explorer__code-block-title" },
            title
          ),
        react_1.default.createElement(
          "div",
          { className: "openapi-explorer__code-block-content" },
          react_1.default.createElement(
            prism_react_renderer_1.Highlight,
            // {...defaultProps}
            {
              // {...defaultProps}
              theme: prismTheme,
              code: code,
              language: language ?? "text",
            },
            ({ className, tokens, getLineProps, getTokenProps }) =>
              react_1.default.createElement(
                "pre",
                {
                  /* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */
                  tabIndex: 0,
                  className: (0, clsx_1.default)(
                    className,
                    "openapi-explorer__code-block",
                    "thin-scrollbar"
                  ),
                },
                react_1.default.createElement(
                  "code",
                  {
                    className: (0, clsx_1.default)(
                      "openapi-explorer__code-block-lines",
                      showLineNumbers &&
                        "openapi-explorer__code-block-lines-numbers"
                    ),
                  },
                  tokens.map((line, i) =>
                    react_1.default.createElement(Line_1.default, {
                      key: i,
                      line: line,
                      getLineProps: getLineProps,
                      getTokenProps: getTokenProps,
                      classNames: lineClassNames[i],
                      showLineNumbers: showLineNumbers,
                    })
                  )
                )
              )
          ),
          react_1.default.createElement(
            "div",
            { className: "openapi-explorer__code-block-btn-group" },
            react_1.default.createElement(CopyButton_1.default, {
              className: "openapi-explorer__code-block-code-btn",
              code: code,
            }),
            react_1.default.createElement(ExitButton_1.default, {
              className: "openapi-explorer__code-block-code-btn",
              handler: () => setIsModalOpen(false),
            })
          )
        )
      )
    )
  );
}
