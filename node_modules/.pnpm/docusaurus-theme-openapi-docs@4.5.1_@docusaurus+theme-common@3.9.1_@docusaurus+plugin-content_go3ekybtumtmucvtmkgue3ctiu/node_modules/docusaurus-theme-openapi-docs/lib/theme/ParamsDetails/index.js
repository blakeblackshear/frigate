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
const react_1 = __importDefault(require("react"));
const BrowserOnly_1 = __importDefault(require("@docusaurus/BrowserOnly"));
const Details_1 = __importDefault(require("@theme/Details"));
const ParamsItem_1 = __importDefault(require("@theme/ParamsItem"));
const SkeletonLoader_1 = __importDefault(require("@theme/SkeletonLoader"));
const ParamsDetailsComponent = ({ parameters }) => {
  const types = ["path", "query", "header", "cookie"];
  return react_1.default.createElement(
    react_1.default.Fragment,
    null,
    types.map((type) => {
      const params = parameters?.filter((param) => param?.in === type);
      if (!params || params.length === 0) {
        return null;
      }
      const summaryElement = react_1.default.createElement(
        "summary",
        null,
        react_1.default.createElement(
          "h3",
          { className: "openapi-markdown__details-summary-header-params" },
          `${type.charAt(0).toUpperCase() + type.slice(1)} Parameters`
        )
      );
      return react_1.default.createElement(
        Details_1.default,
        {
          key: type,
          className: "openapi-markdown__details",
          style: { marginBottom: "1rem" },
          "data-collapsed": false,
          open: true,
          summary: summaryElement,
        },
        react_1.default.createElement(
          "ul",
          null,
          params.map((param, index) =>
            react_1.default.createElement(ParamsItem_1.default, {
              key: index,
              className: "paramsItem",
              param: {
                ...param,
                enumDescriptions: Object.entries(
                  param?.schema?.["x-enumDescriptions"] ??
                    param?.schema?.items?.["x-enumDescriptions"] ??
                    {}
                ),
              },
            })
          )
        )
      );
    })
  );
};
const ParamsDetails = (props) => {
  return react_1.default.createElement(
    BrowserOnly_1.default,
    {
      fallback: react_1.default.createElement(SkeletonLoader_1.default, {
        size: "sm",
      }),
    },
    () => {
      return react_1.default.createElement(ParamsDetailsComponent, {
        ...props,
      });
    }
  );
};
exports.default = ParamsDetails;
