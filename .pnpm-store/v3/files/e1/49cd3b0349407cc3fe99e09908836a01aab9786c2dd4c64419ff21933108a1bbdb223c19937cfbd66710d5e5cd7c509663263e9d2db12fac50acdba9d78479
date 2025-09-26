import { checkGlobals } from './utils/internal/checkGlobals'

export { SetupApi } from './SetupApi'

/* HTTP handlers */
export { RequestHandler } from './handlers/RequestHandler'
export { http } from './http'
export { HttpHandler, HttpMethods } from './handlers/HttpHandler'
export { graphql } from './graphql'
export { GraphQLHandler } from './handlers/GraphQLHandler'

/* WebSocket handler */
export { ws, type WebSocketLink } from './ws'
export {
  WebSocketHandler,
  type WebSocketHandlerEventMap,
  type WebSocketHandlerConnection,
} from './handlers/WebSocketHandler'

/* Utils */
export { matchRequestUrl } from './utils/matching/matchRequestUrl'
export * from './utils/handleRequest'
export { getResponse } from './getResponse'
export { cleanUrl } from './utils/url/cleanUrl'

/**
 * Type definitions.
 */

export type { SharedOptions, LifeCycleEventsMap } from './sharedOptions'

export type {
  ResponseResolver,
  ResponseResolverReturnType,
  AsyncResponseResolverReturnType,
  RequestHandlerOptions,
  DefaultBodyType,
  DefaultRequestMultipartBody,
  JsonBodyType,
} from './handlers/RequestHandler'

export type {
  RequestQuery,
  HttpRequestParsedResult,
  HttpCustomPredicate,
} from './handlers/HttpHandler'
export type { HttpRequestHandler, HttpResponseResolver } from './http'

export type {
  GraphQLQuery,
  GraphQLVariables,
  GraphQLRequestBody,
  GraphQLResponseBody,
  GraphQLJsonRequestBody,
  GraphQLOperationType,
  GraphQLCustomPredicate,
} from './handlers/GraphQLHandler'
export type { GraphQLRequestHandler, GraphQLResponseResolver } from './graphql'

export type { WebSocketData, WebSocketEventListener } from './ws'

export type { Path, PathParams, Match } from './utils/matching/matchRequestUrl'
export type { ParsedGraphQLRequest } from './utils/internal/parseGraphQLRequest'

export * from './HttpResponse'
export * from './delay'
export { bypass } from './bypass'
export { passthrough } from './passthrough'
export { isCommonAssetRequest } from './isCommonAssetRequest'

// Validate environmental globals before executing any code.
// This ensures that the library gives user-friendly errors
// when ran in the environments that require additional polyfills
// from the end user.
checkGlobals()
