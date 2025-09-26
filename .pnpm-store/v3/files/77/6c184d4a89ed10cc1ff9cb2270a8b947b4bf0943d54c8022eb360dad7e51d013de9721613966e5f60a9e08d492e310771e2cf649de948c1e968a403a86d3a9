import type { DocumentNode, GraphQLError, OperationTypeNode } from 'graphql'
import {
  DefaultBodyType,
  RequestHandler,
  RequestHandlerDefaultInfo,
  RequestHandlerOptions,
  ResponseResolver,
} from './RequestHandler'
import { getTimestamp } from '../utils/logging/getTimestamp'
import { getStatusCodeColor } from '../utils/logging/getStatusCodeColor'
import { serializeRequest } from '../utils/logging/serializeRequest'
import { serializeResponse } from '../utils/logging/serializeResponse'
import { Match, matchRequestUrl, Path } from '../utils/matching/matchRequestUrl'
import {
  ParsedGraphQLRequest,
  GraphQLMultipartRequestBody,
  parseGraphQLRequest,
  parseDocumentNode,
} from '../utils/internal/parseGraphQLRequest'
import { toPublicUrl } from '../utils/request/toPublicUrl'
import { devUtils } from '../utils/internal/devUtils'
import { getAllRequestCookies } from '../utils/request/getRequestCookies'

export type GraphQLOperationType = OperationTypeNode | 'all'
export type GraphQLHandlerNameSelector = DocumentNode | RegExp | string

export type GraphQLQuery = Record<string, any> | null
export type GraphQLVariables = Record<string, any>

export interface GraphQLHandlerInfo extends RequestHandlerDefaultInfo {
  operationType: GraphQLOperationType
  operationName: GraphQLHandlerNameSelector | GraphQLCustomPredicate
}

export type GraphQLRequestParsedResult = {
  match: Match
  cookies: Record<string, string>
} & (
  | ParsedGraphQLRequest<GraphQLVariables>
  /**
   * An empty version of the ParsedGraphQLRequest
   * which simplifies the return type of the resolver
   * when the request is to a non-matching endpoint
   */
  | {
      operationType?: undefined
      operationName?: undefined
      query?: undefined
      variables?: undefined
    }
)

export type GraphQLResolverExtras<Variables extends GraphQLVariables> = {
  query: string
  operationName: string
  variables: Variables
  cookies: Record<string, string>
}

export type GraphQLRequestBody<VariablesType extends GraphQLVariables> =
  | GraphQLJsonRequestBody<VariablesType>
  | GraphQLMultipartRequestBody
  | Record<string, any>
  | undefined

export interface GraphQLJsonRequestBody<Variables extends GraphQLVariables> {
  query: string
  variables?: Variables
}

export type GraphQLResponseBody<BodyType extends DefaultBodyType> =
  | {
      data?: BodyType | null
      errors?: readonly Partial<GraphQLError>[] | null
      extensions?: Record<string, any>
    }
  | null
  | undefined

export type GraphQLCustomPredicate = (args: {
  request: Request
  query: string
  operationType: GraphQLOperationType
  operationName: string
  variables: GraphQLVariables
  cookies: Record<string, string>
}) => GraphQLCustomPredicateResult | Promise<GraphQLCustomPredicateResult>

export type GraphQLCustomPredicateResult = boolean | { matches: boolean }

export type GraphQLPredicate =
  | GraphQLHandlerNameSelector
  | GraphQLCustomPredicate

export function isDocumentNode(
  value: DocumentNode | any,
): value is DocumentNode {
  if (value == null) {
    return false
  }

  return typeof value === 'object' && 'kind' in value && 'definitions' in value
}

export class GraphQLHandler extends RequestHandler<
  GraphQLHandlerInfo,
  GraphQLRequestParsedResult,
  GraphQLResolverExtras<any>
> {
  private endpoint: Path

  static parsedRequestCache = new WeakMap<
    Request,
    ParsedGraphQLRequest<GraphQLVariables>
  >()

  constructor(
    operationType: GraphQLOperationType,
    predicate: GraphQLPredicate,
    endpoint: Path,
    resolver: ResponseResolver<GraphQLResolverExtras<any>, any, any>,
    options?: RequestHandlerOptions,
  ) {
    let resolvedOperationName = predicate

    if (isDocumentNode(resolvedOperationName)) {
      const parsedNode = parseDocumentNode(resolvedOperationName)

      if (parsedNode.operationType !== operationType) {
        throw new Error(
          `Failed to create a GraphQL handler: provided a DocumentNode with a mismatched operation type (expected "${operationType}", but got "${parsedNode.operationType}").`,
        )
      }

      if (!parsedNode.operationName) {
        throw new Error(
          `Failed to create a GraphQL handler: provided a DocumentNode with no operation name.`,
        )
      }

      resolvedOperationName = parsedNode.operationName
    }

    const displayOperationName =
      typeof resolvedOperationName === 'function'
        ? '[custom predicate]'
        : resolvedOperationName

    const header =
      operationType === 'all'
        ? `${operationType} (origin: ${endpoint.toString()})`
        : `${operationType}${displayOperationName ? ` ${displayOperationName}` : ''} (origin: ${endpoint.toString()})`

    super({
      info: {
        header,
        operationType,
        operationName: resolvedOperationName,
      },
      resolver,
      options,
    })

    this.endpoint = endpoint
  }

  /**
   * Parses the request body, once per request, cached across all
   * GraphQL handlers. This is done to avoid multiple parsing of the
   * request body, which each requires a clone of the request.
   */
  async parseGraphQLRequestOrGetFromCache(
    request: Request,
  ): Promise<ParsedGraphQLRequest<GraphQLVariables>> {
    if (!GraphQLHandler.parsedRequestCache.has(request)) {
      GraphQLHandler.parsedRequestCache.set(
        request,
        await parseGraphQLRequest(request).catch((error) => {
          console.error(error)
          return undefined
        }),
      )
    }

    return GraphQLHandler.parsedRequestCache.get(request)
  }

  async parse(args: { request: Request }): Promise<GraphQLRequestParsedResult> {
    /**
     * If the request doesn't match a specified endpoint, there's no
     * need to parse it since there's no case where we would handle this
     */
    const match = matchRequestUrl(new URL(args.request.url), this.endpoint)
    const cookies = getAllRequestCookies(args.request)

    if (!match.matches) {
      return {
        match,
        cookies,
      }
    }

    const parsedResult = await this.parseGraphQLRequestOrGetFromCache(
      args.request,
    )

    if (typeof parsedResult === 'undefined') {
      return {
        match,
        cookies,
      }
    }

    return {
      match,
      cookies,
      query: parsedResult.query,
      operationType: parsedResult.operationType,
      operationName: parsedResult.operationName,
      variables: parsedResult.variables,
    }
  }

  async predicate(args: {
    request: Request
    parsedResult: GraphQLRequestParsedResult
  }): Promise<boolean> {
    if (args.parsedResult.operationType === undefined) {
      return false
    }

    if (!args.parsedResult.operationName && this.info.operationType !== 'all') {
      const publicUrl = toPublicUrl(args.request.url)

      devUtils.warn(`\
Failed to intercept a GraphQL request at "${args.request.method} ${publicUrl}": anonymous GraphQL operations are not supported.

Consider naming this operation or using "graphql.operation()" request handler to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/#graphqloperationresolver`)
      return false
    }

    const hasMatchingOperationType =
      this.info.operationType === 'all' ||
      args.parsedResult.operationType === this.info.operationType

    /**
     * Check if the operation name matches the outgoing GraphQL request.
     * @note Unlike the HTTP handler, the custom predicate functions are invoked
     * during predicate, not parsing, because GraphQL request parsing happens first,
     * and non-GraphQL requests are filtered out automatically.
     */
    const hasMatchingOperationName = await this.matchOperationName({
      request: args.request,
      parsedResult: args.parsedResult,
    })

    return (
      args.parsedResult.match.matches &&
      hasMatchingOperationType &&
      hasMatchingOperationName
    )
  }

  private async matchOperationName(args: {
    request: Request
    parsedResult: GraphQLRequestParsedResult
  }): Promise<boolean> {
    if (typeof this.info.operationName === 'function') {
      const customPredicateResult = await this.info.operationName({
        request: args.request,
        ...this.extendResolverArgs({
          request: args.request,
          parsedResult: args.parsedResult,
        }),
      })

      /**
       * @note Keep the { matches } signature in case we decide to support path parameters
       * in GraphQL handlers. If that happens, the custom predicate would have to be moved
       * to the parsing phase, the same as we have for the HttpHandler, and the user will
       * have a possibility to return parsed path parameters from the custom predicate.
       */
      return typeof customPredicateResult === 'boolean'
        ? customPredicateResult
        : customPredicateResult.matches
    }

    if (this.info.operationName instanceof RegExp) {
      return this.info.operationName.test(args.parsedResult.operationName || '')
    }

    return args.parsedResult.operationName === this.info.operationName
  }

  protected extendResolverArgs(args: {
    request: Request
    parsedResult: GraphQLRequestParsedResult
  }) {
    return {
      query: args.parsedResult.query || '',
      operationType: args.parsedResult.operationType!,
      operationName: args.parsedResult.operationName || '',
      variables: args.parsedResult.variables || {},
      cookies: args.parsedResult.cookies,
    }
  }

  async log(args: {
    request: Request
    response: Response
    parsedResult: GraphQLRequestParsedResult
  }) {
    const loggedRequest = await serializeRequest(args.request)
    const loggedResponse = await serializeResponse(args.response)
    const statusColor = getStatusCodeColor(loggedResponse.status)
    const requestInfo = args.parsedResult.operationName
      ? `${args.parsedResult.operationType} ${args.parsedResult.operationName}`
      : `anonymous ${args.parsedResult.operationType}`

    console.groupCollapsed(
      devUtils.formatMessage(
        `${getTimestamp()} ${requestInfo} (%c${loggedResponse.status} ${
          loggedResponse.statusText
        }%c)`,
      ),
      `color:${statusColor}`,
      'color:inherit',
    )
    // eslint-disable-next-line no-console
    console.log('Request:', loggedRequest)
    // eslint-disable-next-line no-console
    console.log('Handler:', this)
    // eslint-disable-next-line no-console
    console.log('Response:', loggedResponse)
    console.groupEnd()
  }
}
