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
exports.default = ApiItem;
const react_1 = __importDefault(require("react"));
const BrowserOnly_1 = __importDefault(require("@docusaurus/BrowserOnly"));
const ExecutionEnvironment_1 = __importDefault(
  require("@docusaurus/ExecutionEnvironment")
);
const client_1 = require("@docusaurus/plugin-content-docs/client");
const theme_common_1 = require("@docusaurus/theme-common");
const useDocusaurusContext_1 = __importDefault(
  require("@docusaurus/useDocusaurusContext")
);
const useIsBrowser_1 = __importDefault(require("@docusaurus/useIsBrowser"));
const slice_1 = require("@theme/ApiExplorer/Authorization/slice");
const persistanceMiddleware_1 = require("@theme/ApiExplorer/persistanceMiddleware");
const Layout_1 = __importDefault(require("@theme/ApiItem/Layout"));
const CodeBlock_1 = __importDefault(require("@theme/CodeBlock"));
const Metadata_1 = __importDefault(require("@theme/DocItem/Metadata"));
const SkeletonLoader_1 = __importDefault(require("@theme/SkeletonLoader"));
const clsx_1 = __importDefault(require("clsx"));
const pako_1 = require("pako");
const react_redux_1 = require("react-redux");
const store_1 = require("./store");
let ApiExplorer = (_) => react_1.default.createElement("div", null);
if (ExecutionEnvironment_1.default.canUseDOM) {
  ApiExplorer = require("@theme/ApiExplorer").default;
}
function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
// @ts-ignore
function ApiItem(props) {
  const docHtmlClassName = `docs-doc-id-${props.content.metadata.id}`;
  const MDXComponent = props.content;
  const { frontMatter } = MDXComponent;
  const { info_path: infoPath } = frontMatter;
  let { api } = frontMatter;
  const { schema } = frontMatter;
  const { sample } = frontMatter;
  // decompress and parse
  if (api) {
    try {
      api = JSON.parse(
        new TextDecoder().decode((0, pako_1.ungzip)(base64ToUint8Array(api)))
      );
    } catch {}
  }
  const { siteConfig } = (0, useDocusaurusContext_1.default)();
  const themeConfig = siteConfig.themeConfig;
  const options = themeConfig.api;
  const isBrowser = (0, useIsBrowser_1.default)();
  // Regex for 2XX status
  const statusRegex = new RegExp("(20[0-9]|2[1-9][0-9])");
  // Define store2
  let store2 = {};
  const persistanceMiddleware = (0,
  persistanceMiddleware_1.createPersistanceMiddleware)(options);
  // Init store for SSR
  if (!isBrowser) {
    store2 = (0, store_1.createStoreWithoutState)({}, [persistanceMiddleware]);
  }
  // Init store for CSR to hydrate components
  if (isBrowser) {
    // Create list of only 2XX response content types to create request samples from
    let acceptArray = [];
    for (const [code, content] of Object.entries(api?.responses ?? [])) {
      if (statusRegex.test(code)) {
        acceptArray.push(Object.keys(content.content ?? {}));
      }
    }
    acceptArray = acceptArray.flat();
    const content = api?.requestBody?.content ?? {};
    const contentTypeArray = Object.keys(content);
    const servers = api?.servers ?? [];
    const params = {
      path: [],
      query: [],
      header: [],
      cookie: [],
    };
    api?.parameters?.forEach((param) => {
      const paramType = param.in;
      const paramsArray = params[paramType];
      paramsArray.push(param);
    });
    const auth = (0, slice_1.createAuth)({
      security: api?.security,
      securitySchemes: api?.securitySchemes,
      options,
    });
    // TODO: determine way to rehydrate without flashing
    // const acceptValue = window?.sessionStorage.getItem("accept");
    // const contentTypeValue = window?.sessionStorage.getItem("contentType");
    const server = window?.sessionStorage.getItem("server");
    const serverObject = JSON.parse(server) ?? {};
    store2 = (0, store_1.createStoreWithState)(
      {
        accept: {
          value: acceptArray[0],
          options: acceptArray,
        },
        contentType: {
          value: contentTypeArray[0],
          options: contentTypeArray,
        },
        server: {
          value: serverObject.url ? serverObject : undefined,
          options: servers,
        },
        response: { value: undefined },
        body: { type: "empty" },
        params,
        auth,
      },
      [persistanceMiddleware]
    );
  }
  if (api) {
    return react_1.default.createElement(
      client_1.DocProvider,
      { content: props.content },
      react_1.default.createElement(
        theme_common_1.HtmlClassNameProvider,
        { className: docHtmlClassName },
        react_1.default.createElement(Metadata_1.default, null),
        react_1.default.createElement(
          Layout_1.default,
          null,
          react_1.default.createElement(
            react_redux_1.Provider,
            { store: store2 },
            react_1.default.createElement(
              "div",
              { className: (0, clsx_1.default)("row", "theme-api-markdown") },
              react_1.default.createElement(
                "div",
                { className: "col col--7 openapi-left-panel__container" },
                react_1.default.createElement(MDXComponent, null)
              ),
              react_1.default.createElement(
                "div",
                { className: "col col--5 openapi-right-panel__container" },
                react_1.default.createElement(
                  BrowserOnly_1.default,
                  {
                    fallback: react_1.default.createElement(
                      SkeletonLoader_1.default,
                      { size: "lg" }
                    ),
                  },
                  () => {
                    return react_1.default.createElement(ApiExplorer, {
                      item: api,
                      infoPath: infoPath,
                    });
                  }
                )
              )
            )
          )
        )
      )
    );
  } else if (schema) {
    return react_1.default.createElement(
      client_1.DocProvider,
      { content: props.content },
      react_1.default.createElement(
        theme_common_1.HtmlClassNameProvider,
        { className: docHtmlClassName },
        react_1.default.createElement(Metadata_1.default, null),
        react_1.default.createElement(
          Layout_1.default,
          null,
          react_1.default.createElement(
            "div",
            { className: (0, clsx_1.default)("row", "theme-api-markdown") },
            react_1.default.createElement(
              "div",
              { className: "col col--7 openapi-left-panel__container schema" },
              react_1.default.createElement(MDXComponent, null)
            ),
            react_1.default.createElement(
              "div",
              { className: "col col--5 openapi-right-panel__container" },
              react_1.default.createElement(
                CodeBlock_1.default,
                { language: "json", title: `${frontMatter.title}` },
                JSON.stringify(sample, null, 2)
              )
            )
          )
        )
      )
    );
  }
  // Non-API docs
  return react_1.default.createElement(
    client_1.DocProvider,
    { content: props.content },
    react_1.default.createElement(
      theme_common_1.HtmlClassNameProvider,
      { className: docHtmlClassName },
      react_1.default.createElement(Metadata_1.default, null),
      react_1.default.createElement(
        Layout_1.default,
        null,
        react_1.default.createElement(
          "div",
          { className: "row" },
          react_1.default.createElement(
            "div",
            { className: "col col--12 markdown" },
            react_1.default.createElement(MDXComponent, null)
          )
        )
      )
    )
  );
}
