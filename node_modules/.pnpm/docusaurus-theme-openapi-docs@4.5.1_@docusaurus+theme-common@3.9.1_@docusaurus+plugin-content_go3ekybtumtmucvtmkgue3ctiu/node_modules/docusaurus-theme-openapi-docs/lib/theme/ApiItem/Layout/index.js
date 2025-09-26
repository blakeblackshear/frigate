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
exports.default = DocItemLayout;
const react_1 = __importDefault(require("react"));
const client_1 = require("@docusaurus/plugin-content-docs/client");
const theme_common_1 = require("@docusaurus/theme-common");
const ContentVisibility_1 = __importDefault(
  require("@theme/ContentVisibility")
);
const DocBreadcrumbs_1 = __importDefault(require("@theme/DocBreadcrumbs"));
const Content_1 = __importDefault(require("@theme/DocItem/Content"));
const Footer_1 = __importDefault(require("@theme/DocItem/Footer"));
const Paginator_1 = __importDefault(require("@theme/DocItem/Paginator"));
const Desktop_1 = __importDefault(require("@theme/DocItem/TOC/Desktop"));
const Mobile_1 = __importDefault(require("@theme/DocItem/TOC/Mobile"));
const DocVersionBadge_1 = __importDefault(require("@theme/DocVersionBadge"));
const DocVersionBanner_1 = __importDefault(require("@theme/DocVersionBanner"));
const clsx_1 = __importDefault(require("clsx"));
const styles_module_css_1 = __importDefault(require("./styles.module.css"));
/**
 * Decide if the toc should be rendered, on mobile or desktop viewports
 */
function useDocTOC() {
  const { frontMatter, toc } = (0, client_1.useDoc)();
  const windowSize = (0, theme_common_1.useWindowSize)();
  const hidden = frontMatter.hide_table_of_contents;
  const canRender = !hidden && toc.length > 0;
  const mobile = canRender
    ? react_1.default.createElement(Mobile_1.default, null)
    : undefined;
  const desktop =
    canRender && (windowSize === "desktop" || windowSize === "ssr")
      ? react_1.default.createElement(Desktop_1.default, null)
      : undefined;
  return {
    hidden,
    mobile,
    desktop,
  };
}
function DocItemLayout({ children }) {
  const docTOC = useDocTOC();
  const { metadata } = (0, client_1.useDoc)();
  const { frontMatter } = (0, client_1.useDoc)();
  const api = frontMatter.api;
  const schema = frontMatter.schema;
  return react_1.default.createElement(
    "div",
    { className: "row" },
    react_1.default.createElement(
      "div",
      {
        className: (0, clsx_1.default)(
          "col",
          !docTOC.hidden && styles_module_css_1.default.docItemCol
        ),
      },
      react_1.default.createElement(ContentVisibility_1.default, {
        metadata: metadata,
      }),
      react_1.default.createElement(DocVersionBanner_1.default, null),
      react_1.default.createElement(
        "div",
        { className: styles_module_css_1.default.docItemContainer },
        react_1.default.createElement(
          "article",
          null,
          react_1.default.createElement(DocBreadcrumbs_1.default, null),
          react_1.default.createElement(DocVersionBadge_1.default, null),
          docTOC.mobile,
          react_1.default.createElement(Content_1.default, null, children),
          react_1.default.createElement(
            "div",
            { className: "row" },
            react_1.default.createElement(
              "div",
              {
                className: (0, clsx_1.default)(
                  "col",
                  api || schema ? "col--7" : "col--12"
                ),
              },
              react_1.default.createElement(Footer_1.default, null)
            )
          )
        ),
        react_1.default.createElement(
          "div",
          { className: "row" },
          react_1.default.createElement(
            "div",
            {
              className: (0, clsx_1.default)(
                "col",
                api || schema ? "col--7" : "col--12"
              ),
            },
            react_1.default.createElement(Paginator_1.default, null)
          )
        )
      )
    ),
    docTOC.desktop &&
      react_1.default.createElement(
        "div",
        { className: "col col--3" },
        docTOC.desktop
      )
  );
}
