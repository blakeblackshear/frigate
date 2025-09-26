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
exports.default = CodeBlockString;
const react_1 = __importDefault(require("react"));
const theme_common_1 = require("@docusaurus/theme-common");
const internal_1 = require("@docusaurus/theme-common/internal");
const Container_1 = __importDefault(
  require("@theme/ApiExplorer/ApiCodeBlock/Container")
);
const CopyButton_1 = __importDefault(
  require("@theme/ApiExplorer/ApiCodeBlock/CopyButton")
);
const ExpandButton_1 = __importDefault(
  require("@theme/ApiExplorer/ApiCodeBlock/ExpandButton")
);
const Line_1 = __importDefault(require("@theme/ApiExplorer/ApiCodeBlock/Line"));
const WordWrapButton_1 = __importDefault(
  require("@theme/ApiExplorer/ApiCodeBlock/WordWrapButton")
);
const clsx_1 = __importDefault(require("clsx"));
const prism_react_renderer_1 = require("prism-react-renderer");
function CodeBlockString({
  children,
  className: blockClassName = "",
  metastring,
  title: titleProp,
  showLineNumbers: showLineNumbersProp,
  language: languageProp,
}) {
  const {
    prism: { defaultLanguage, magicComments },
  } = (0, theme_common_1.useThemeConfig)();
  const language =
    languageProp ??
    (0, internal_1.parseLanguage)(blockClassName) ??
    defaultLanguage;
  const prismTheme = (0, theme_common_1.usePrismTheme)();
  const wordWrap = (0, internal_1.useCodeWordWrap)();
  // We still parse the metastring in case we want to support more syntax in the
  // future. Note that MDX doesn't strip quotes when parsing metastring:
  // "title=\"xyz\"" => title: "\"xyz\""
  const title = (0, internal_1.parseCodeBlockTitle)(metastring) || titleProp;
  const { lineClassNames, code } = (0, internal_1.parseLines)(children, {
    metastring,
    language,
    magicComments,
  });
  const showLineNumbers =
    showLineNumbersProp ?? (0, internal_1.containsLineNumbers)(metastring);
  return react_1.default.createElement(
    Container_1.default,
    {
      as: "div",
      className: (0, clsx_1.default)(
        blockClassName,
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
              ref: wordWrap.codeBlockRef,
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
                    "openapi-explorer__code-block-lines-numbering"
                ),
              },
              tokens.map((line, i) =>
                react_1.default.createElement(Line_1.default, {
                  key: i,
                  line: line,
                  getLineProps: getLineProps,
                  getTokenProps: getTokenProps,
                  classNames: lineClassNames[i],
                  showLineNumbers: !!showLineNumbers,
                })
              )
            )
          )
      ),
      react_1.default.createElement(
        "div",
        { className: "openapi-explorer__code-block-btn-group" },
        (wordWrap.isEnabled || wordWrap.isCodeScrollable) &&
          react_1.default.createElement(WordWrapButton_1.default, {
            className: "openapi-explorer__code-block-code-btn",
            onClick: () => wordWrap.toggle(),
            isEnabled: wordWrap.isEnabled,
          }),
        react_1.default.createElement(CopyButton_1.default, {
          className: "openapi-explorer__code-block-code-btn",
          code: code,
        }),
        react_1.default.createElement(ExpandButton_1.default, {
          className: (0, clsx_1.default)(
            "openapi-explorer__code-block-code-btn",
            "openapi-explorer__expand-btn"
          ),
          code: code,
          language: language ?? "text",
          showLineNumbers: !!showLineNumbers,
          blockClassName: blockClassName,
          title: typeof title === "string" ? title : undefined,
          lineClassNames: lineClassNames,
        })
      )
    )
  );
}
