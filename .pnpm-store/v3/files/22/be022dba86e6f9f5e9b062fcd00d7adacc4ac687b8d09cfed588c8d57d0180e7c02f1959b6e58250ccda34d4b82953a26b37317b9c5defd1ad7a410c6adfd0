"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var GraphQLHandler_exports = {};
__export(GraphQLHandler_exports, {
  GraphQLHandler: () => GraphQLHandler,
  isDocumentNode: () => isDocumentNode
});
module.exports = __toCommonJS(GraphQLHandler_exports);
var import_RequestHandler = require("./RequestHandler");
var import_getTimestamp = require("../utils/logging/getTimestamp");
var import_getStatusCodeColor = require("../utils/logging/getStatusCodeColor");
var import_serializeRequest = require("../utils/logging/serializeRequest");
var import_serializeResponse = require("../utils/logging/serializeResponse");
var import_matchRequestUrl = require("../utils/matching/matchRequestUrl");
var import_parseGraphQLRequest = require("../utils/internal/parseGraphQLRequest");
var import_toPublicUrl = require("../utils/request/toPublicUrl");
var import_devUtils = require("../utils/internal/devUtils");
var import_getRequestCookies = require("../utils/request/getRequestCookies");
function isDocumentNode(value) {
  if (value == null) {
    return false;
  }
  return typeof value === "object" && "kind" in value && "definitions" in value;
}
class GraphQLHandler extends import_RequestHandler.RequestHandler {
  endpoint;
  static parsedRequestCache = /* @__PURE__ */ new WeakMap();
  constructor(operationType, predicate, endpoint, resolver, options) {
    let resolvedOperationName = predicate;
    if (isDocumentNode(resolvedOperationName)) {
      const parsedNode = (0, import_parseGraphQLRequest.parseDocumentNode)(resolvedOperationName);
      if (parsedNode.operationType !== operationType) {
        throw new Error(
          `Failed to create a GraphQL handler: provided a DocumentNode with a mismatched operation type (expected "${operationType}", but got "${parsedNode.operationType}").`
        );
      }
      if (!parsedNode.operationName) {
        throw new Error(
          `Failed to create a GraphQL handler: provided a DocumentNode with no operation name.`
        );
      }
      resolvedOperationName = parsedNode.operationName;
    }
    const displayOperationName = typeof resolvedOperationName === "function" ? "[custom predicate]" : resolvedOperationName;
    const header = operationType === "all" ? `${operationType} (origin: ${endpoint.toString()})` : `${operationType}${displayOperationName ? ` ${displayOperationName}` : ""} (origin: ${endpoint.toString()})`;
    super({
      info: {
        header,
        operationType,
        operationName: resolvedOperationName
      },
      resolver,
      options
    });
    this.endpoint = endpoint;
  }
  /**
   * Parses the request body, once per request, cached across all
   * GraphQL handlers. This is done to avoid multiple parsing of the
   * request body, which each requires a clone of the request.
   */
  async parseGraphQLRequestOrGetFromCache(request) {
    if (!GraphQLHandler.parsedRequestCache.has(request)) {
      GraphQLHandler.parsedRequestCache.set(
        request,
        await (0, import_parseGraphQLRequest.parseGraphQLRequest)(request).catch((error) => {
          console.error(error);
          return void 0;
        })
      );
    }
    return GraphQLHandler.parsedRequestCache.get(request);
  }
  async parse(args) {
    const match = (0, import_matchRequestUrl.matchRequestUrl)(new URL(args.request.url), this.endpoint);
    const cookies = (0, import_getRequestCookies.getAllRequestCookies)(args.request);
    if (!match.matches) {
      return {
        match,
        cookies
      };
    }
    const parsedResult = await this.parseGraphQLRequestOrGetFromCache(
      args.request
    );
    if (typeof parsedResult === "undefined") {
      return {
        match,
        cookies
      };
    }
    return {
      match,
      cookies,
      query: parsedResult.query,
      operationType: parsedResult.operationType,
      operationName: parsedResult.operationName,
      variables: parsedResult.variables
    };
  }
  async predicate(args) {
    if (args.parsedResult.operationType === void 0) {
      return false;
    }
    if (!args.parsedResult.operationName && this.info.operationType !== "all") {
      const publicUrl = (0, import_toPublicUrl.toPublicUrl)(args.request.url);
      import_devUtils.devUtils.warn(`Failed to intercept a GraphQL request at "${args.request.method} ${publicUrl}": anonymous GraphQL operations are not supported.

Consider naming this operation or using "graphql.operation()" request handler to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/#graphqloperationresolver`);
      return false;
    }
    const hasMatchingOperationType = this.info.operationType === "all" || args.parsedResult.operationType === this.info.operationType;
    const hasMatchingOperationName = await this.matchOperationName({
      request: args.request,
      parsedResult: args.parsedResult
    });
    return args.parsedResult.match.matches && hasMatchingOperationType && hasMatchingOperationName;
  }
  async matchOperationName(args) {
    if (typeof this.info.operationName === "function") {
      const customPredicateResult = await this.info.operationName({
        request: args.request,
        ...this.extendResolverArgs({
          request: args.request,
          parsedResult: args.parsedResult
        })
      });
      return typeof customPredicateResult === "boolean" ? customPredicateResult : customPredicateResult.matches;
    }
    if (this.info.operationName instanceof RegExp) {
      return this.info.operationName.test(args.parsedResult.operationName || "");
    }
    return args.parsedResult.operationName === this.info.operationName;
  }
  extendResolverArgs(args) {
    return {
      query: args.parsedResult.query || "",
      operationType: args.parsedResult.operationType,
      operationName: args.parsedResult.operationName || "",
      variables: args.parsedResult.variables || {},
      cookies: args.parsedResult.cookies
    };
  }
  async log(args) {
    const loggedRequest = await (0, import_serializeRequest.serializeRequest)(args.request);
    const loggedResponse = await (0, import_serializeResponse.serializeResponse)(args.response);
    const statusColor = (0, import_getStatusCodeColor.getStatusCodeColor)(loggedResponse.status);
    const requestInfo = args.parsedResult.operationName ? `${args.parsedResult.operationType} ${args.parsedResult.operationName}` : `anonymous ${args.parsedResult.operationType}`;
    console.groupCollapsed(
      import_devUtils.devUtils.formatMessage(
        `${(0, import_getTimestamp.getTimestamp)()} ${requestInfo} (%c${loggedResponse.status} ${loggedResponse.statusText}%c)`
      ),
      `color:${statusColor}`,
      "color:inherit"
    );
    console.log("Request:", loggedRequest);
    console.log("Handler:", this);
    console.log("Response:", loggedResponse);
    console.groupEnd();
  }
}
//# sourceMappingURL=GraphQLHandler.js.map