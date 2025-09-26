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
// @ts-nocheck
const react_1 = __importStar(require("react"));
const client_1 = require("@docusaurus/plugin-content-docs/client");
const Accept_1 = __importDefault(require("@theme/ApiExplorer/Accept"));
const Authorization_1 = __importDefault(
  require("@theme/ApiExplorer/Authorization")
);
const Body_1 = __importDefault(require("@theme/ApiExplorer/Body"));
const buildPostmanRequest_1 = __importDefault(
  require("@theme/ApiExplorer/buildPostmanRequest")
);
const ContentType_1 = __importDefault(
  require("@theme/ApiExplorer/ContentType")
);
const ParamOptions_1 = __importDefault(
  require("@theme/ApiExplorer/ParamOptions")
);
const slice_1 = require("@theme/ApiExplorer/Response/slice");
const Server_1 = __importDefault(require("@theme/ApiExplorer/Server"));
const hooks_1 = require("@theme/ApiItem/hooks");
const sdk = __importStar(require("postman-collection"));
const react_hook_form_1 = require("react-hook-form");
const makeRequest_1 = __importDefault(require("./makeRequest"));
function Request({ item }) {
  const postman = new sdk.Request(item.postman);
  const metadata = (0, client_1.useDoc)();
  const { proxy, hide_send_button: hideSendButton } = metadata.frontMatter;
  const pathParams = (0, hooks_1.useTypedSelector)(
    (state) => state.params.path
  );
  const queryParams = (0, hooks_1.useTypedSelector)(
    (state) => state.params.query
  );
  const cookieParams = (0, hooks_1.useTypedSelector)(
    (state) => state.params.cookie
  );
  const contentType = (0, hooks_1.useTypedSelector)(
    (state) => state.contentType.value
  );
  const headerParams = (0, hooks_1.useTypedSelector)(
    (state) => state.params.header
  );
  const body = (0, hooks_1.useTypedSelector)((state) => state.body);
  const accept = (0, hooks_1.useTypedSelector)((state) => state.accept.value);
  const acceptOptions = (0, hooks_1.useTypedDispatch)(
    (state) => state.accept.options
  );
  const authSelected = (0, hooks_1.useTypedSelector)(
    (state) => state.auth.selected
  );
  const server = (0, hooks_1.useTypedSelector)((state) => state.server.value);
  const serverOptions = (0, hooks_1.useTypedSelector)(
    (state) => state.server.options
  );
  const auth = (0, hooks_1.useTypedSelector)((state) => state.auth);
  const dispatch = (0, hooks_1.useTypedDispatch)();
  const [expandAccept, setExpandAccept] = (0, react_1.useState)(true);
  const [expandAuth, setExpandAuth] = (0, react_1.useState)(true);
  const [expandBody, setExpandBody] = (0, react_1.useState)(true);
  const [expandParams, setExpandParams] = (0, react_1.useState)(true);
  const [expandServer, setExpandServer] = (0, react_1.useState)(true);
  const allParams = [
    ...pathParams,
    ...queryParams,
    ...cookieParams,
    ...headerParams,
  ];
  const postmanRequest = (0, buildPostmanRequest_1.default)(postman, {
    queryParams,
    pathParams,
    cookieParams,
    contentType,
    accept,
    headerParams,
    body,
    server,
    auth,
  });
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const paramsObject = {
    path: [],
    query: [],
    header: [],
    cookie: [],
  };
  item.parameters?.forEach((param) => {
    const paramType = param.in;
    const paramsArray = paramsObject[paramType];
    paramsArray.push(param);
  });
  const methods = (0, react_hook_form_1.useForm)({ shouldFocusError: false });
  const handleEventStream = async (res) => {
    res.headers &&
      dispatch((0, slice_1.setHeaders)(Object.fromEntries(res.headers)));
    dispatch((0, slice_1.setCode)(res.status));
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let result = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
      dispatch((0, slice_1.setResponse)(result));
    }
  };
  const handleResponse = async (res) => {
    dispatch((0, slice_1.setResponse)(await res.text()));
    dispatch((0, slice_1.setCode)(res.status));
    res.headers &&
      dispatch((0, slice_1.setHeaders)(Object.fromEntries(res.headers)));
  };
  const onSubmit = async (data) => {
    dispatch((0, slice_1.setResponse)("Fetching..."));
    try {
      await delay(1200);
      const res = await (0, makeRequest_1.default)(postmanRequest, proxy, body);
      if (res.headers.get("content-type")?.includes("text/event-stream")) {
        await handleEventStream(res);
      } else {
        await handleResponse(res);
      }
    } catch (e) {
      console.log(e);
      dispatch((0, slice_1.setResponse)("Connection failed"));
      dispatch((0, slice_1.clearCode)());
      dispatch((0, slice_1.clearHeaders)());
    }
  };
  const showServerOptions = serverOptions.length > 0;
  const showAcceptOptions = acceptOptions.length > 1;
  const showRequestBody = contentType !== undefined;
  const showRequestButton = item.servers && !hideSendButton;
  const showAuth = authSelected !== undefined;
  const showParams = allParams.length > 0;
  const requestBodyRequired = item.requestBody?.required;
  if (
    !showAcceptOptions &&
    !showAuth &&
    !showParams &&
    !showRequestBody &&
    !showServerOptions
  ) {
    return null;
  }
  const expandAllDetails = () => {
    setExpandAccept(true);
    setExpandAuth(true);
    setExpandBody(true);
    setExpandParams(true);
    setExpandServer(true);
  };
  const collapseAllDetails = () => {
    setExpandAccept(false);
    setExpandAuth(false);
    setExpandBody(false);
    setExpandParams(false);
    setExpandServer(false);
  };
  const allDetailsExpanded =
    expandParams && expandBody && expandServer && expandAuth && expandAccept;
  return react_1.default.createElement(
    react_hook_form_1.FormProvider,
    { ...methods },
    react_1.default.createElement(
      "form",
      {
        className: "openapi-explorer__request-form",
        onSubmit: methods.handleSubmit(onSubmit),
      },
      react_1.default.createElement(
        "div",
        { className: "openapi-explorer__request-header-container" },
        react_1.default.createElement(
          "span",
          { className: "openapi-explorer__request-title" },
          "Request "
        ),
        allDetailsExpanded
          ? react_1.default.createElement(
              "span",
              {
                className: "openapi-explorer__expand-details-btn",
                onClick: collapseAllDetails,
              },
              "Collapse all"
            )
          : react_1.default.createElement(
              "span",
              {
                className: "openapi-explorer__expand-details-btn",
                onClick: expandAllDetails,
              },
              "Expand all"
            )
      ),
      react_1.default.createElement(
        "div",
        { className: "openapi-explorer__details-outer-container" },
        showServerOptions &&
          item.method !== "event" &&
          react_1.default.createElement(
            "details",
            {
              open: expandServer,
              className: "openapi-explorer__details-container",
            },
            react_1.default.createElement(
              "summary",
              {
                className: "openapi-explorer__details-summary",
                onClick: (e) => {
                  e.preventDefault();
                  setExpandServer(!expandServer);
                },
              },
              "Base URL"
            ),
            react_1.default.createElement(Server_1.default, null)
          ),
        showAuth &&
          react_1.default.createElement(
            "details",
            {
              open: expandAuth,
              className: "openapi-explorer__details-container",
            },
            react_1.default.createElement(
              "summary",
              {
                className: "openapi-explorer__details-summary",
                onClick: (e) => {
                  e.preventDefault();
                  setExpandAuth(!expandAuth);
                },
              },
              "Auth"
            ),
            react_1.default.createElement(Authorization_1.default, null)
          ),
        showParams &&
          react_1.default.createElement(
            "details",
            {
              open:
                expandParams || Object.keys(methods.formState.errors).length,
              className: "openapi-explorer__details-container",
            },
            react_1.default.createElement(
              "summary",
              {
                className: "openapi-explorer__details-summary",
                onClick: (e) => {
                  e.preventDefault();
                  setExpandParams(!expandParams);
                },
              },
              "Parameters"
            ),
            react_1.default.createElement(ParamOptions_1.default, null)
          ),
        showRequestBody &&
          react_1.default.createElement(
            "details",
            {
              open: expandBody,
              className: "openapi-explorer__details-container",
            },
            react_1.default.createElement(
              "summary",
              {
                className: "openapi-explorer__details-summary",
                onClick: (e) => {
                  e.preventDefault();
                  setExpandBody(!expandBody);
                },
              },
              "Body",
              requestBodyRequired &&
                react_1.default.createElement(
                  "span",
                  { className: "openapi-schema__required" },
                  "\u00A0required"
                )
            ),
            react_1.default.createElement(
              react_1.default.Fragment,
              null,
              react_1.default.createElement(ContentType_1.default, null),
              react_1.default.createElement(Body_1.default, {
                jsonRequestBodyExample: item.jsonRequestBodyExample,
                requestBodyMetadata: item.requestBody,
                required: requestBodyRequired,
              })
            )
          ),
        showAcceptOptions &&
          react_1.default.createElement(
            "details",
            {
              open: expandAccept,
              className: "openapi-explorer__details-container",
            },
            react_1.default.createElement(
              "summary",
              {
                className: "openapi-explorer__details-summary",
                onClick: (e) => {
                  e.preventDefault();
                  setExpandAccept(!expandAccept);
                },
              },
              "Accept"
            ),
            react_1.default.createElement(Accept_1.default, null)
          ),
        showRequestButton &&
          item.method !== "event" &&
          react_1.default.createElement(
            "button",
            { className: "openapi-explorer__request-btn", type: "submit" },
            "Send API Request"
          )
      )
    )
  );
}
exports.default = Request;
