import {
  RequestHandler
} from './RequestHandler.mjs';
import { getTimestamp } from '../utils/logging/getTimestamp.mjs';
import { getStatusCodeColor } from '../utils/logging/getStatusCodeColor.mjs';
import { serializeRequest } from '../utils/logging/serializeRequest.mjs';
import { serializeResponse } from '../utils/logging/serializeResponse.mjs';
import { matchRequestUrl } from '../utils/matching/matchRequestUrl.mjs';
import {
  parseGraphQLRequest,
  parseDocumentNode
} from '../utils/internal/parseGraphQLRequest.mjs';
import { toPublicUrl } from '../utils/request/toPublicUrl.mjs';
import { devUtils } from '../utils/internal/devUtils.mjs';
import { getAllRequestCookies } from '../utils/request/getRequestCookies.mjs';
function isDocumentNode(value) {
  if (value == null) {
    return false;
  }
  return typeof value === "object" && "kind" in value && "definitions" in value;
}
class GraphQLHandler extends RequestHandler {
  endpoint;
  static parsedRequestCache = /* @__PURE__ */ new WeakMap();
  constructor(operationType, predicate, endpoint, resolver, options) {
    let resolvedOperationName = predicate;
    if (isDocumentNode(resolvedOperationName)) {
      const parsedNode = parseDocumentNode(resolvedOperationName);
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
        await parseGraphQLRequest(request).catch((error) => {
          console.error(error);
          return void 0;
        })
      );
    }
    return GraphQLHandler.parsedRequestCache.get(request);
  }
  async parse(args) {
    const match = matchRequestUrl(new URL(args.request.url), this.endpoint);
    const cookies = getAllRequestCookies(args.request);
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
      const publicUrl = toPublicUrl(args.request.url);
      devUtils.warn(`Failed to intercept a GraphQL request at "${args.request.method} ${publicUrl}": anonymous GraphQL operations are not supported.

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
    const loggedRequest = await serializeRequest(args.request);
    const loggedResponse = await serializeResponse(args.response);
    const statusColor = getStatusCodeColor(loggedResponse.status);
    const requestInfo = args.parsedResult.operationName ? `${args.parsedResult.operationType} ${args.parsedResult.operationName}` : `anonymous ${args.parsedResult.operationType}`;
    console.groupCollapsed(
      devUtils.formatMessage(
        `${getTimestamp()} ${requestInfo} (%c${loggedResponse.status} ${loggedResponse.statusText}%c)`
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
export {
  GraphQLHandler,
  isDocumentNode
};
//# sourceMappingURL=GraphQLHandler.mjs.map