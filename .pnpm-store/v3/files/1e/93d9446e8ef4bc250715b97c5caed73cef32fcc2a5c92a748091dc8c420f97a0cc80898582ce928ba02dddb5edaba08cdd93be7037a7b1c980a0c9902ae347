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
const react_1 = __importDefault(require("react"));
const CodeSnippets_1 = __importDefault(
  require("@theme/ApiExplorer/CodeSnippets")
);
const Request_1 = __importDefault(require("@theme/ApiExplorer/Request"));
const Response_1 = __importDefault(require("@theme/ApiExplorer/Response"));
const SecuritySchemes_1 = __importDefault(
  require("@theme/ApiExplorer/SecuritySchemes")
);
const sdk = __importStar(require("postman-collection"));
function ApiExplorer({ item, infoPath }) {
  const postman = new sdk.Request(
    item.postman
      ? sdk.Request.isRequest(item.postman)
        ? item.postman.toJSON()
        : item.postman
      : {}
  );
  return react_1.default.createElement(
    react_1.default.Fragment,
    null,
    react_1.default.createElement(SecuritySchemes_1.default, {
      infoPath: infoPath,
    }),
    item.method !== "event" &&
      react_1.default.createElement(CodeSnippets_1.default, {
        postman: postman,
        codeSamples: item["x-codeSamples"] ?? [],
      }),
    react_1.default.createElement(Request_1.default, { item: item }),
    react_1.default.createElement(Response_1.default, { item: item })
  );
}
exports.default = ApiExplorer;
