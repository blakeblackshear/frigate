import { DocumentNode } from 'graphql';
import { e as GraphQLQuery, f as GraphQLVariables, q as GraphQLHandlerNameSelector, k as GraphQLCustomPredicate, a as ResponseResolver, r as GraphQLResolverExtras, h as GraphQLResponseBody, c as RequestHandlerOptions, G as GraphQLHandler } from './HttpResponse-BbwAqLE_.js';
import { Path } from './utils/matching/matchRequestUrl.js';
import '@mswjs/interceptors';
import './utils/internal/isIterable.js';
import './typeUtils.js';

interface TypedDocumentNode<Result = {
    [key: string]: any;
}, Variables = {
    [key: string]: any;
}> extends DocumentNode {
    __apiType?: (variables: Variables) => Result;
    __resultType?: Result;
    __variablesType?: Variables;
}
type GraphQLRequestHandler = <Query extends GraphQLQuery = GraphQLQuery, Variables extends GraphQLVariables = GraphQLVariables>(predicate: GraphQLHandlerNameSelector | DocumentNode | TypedDocumentNode<Query, Variables> | GraphQLCustomPredicate, resolver: GraphQLResponseResolver<[
    Query
] extends [never] ? GraphQLQuery : Query, Variables>, options?: RequestHandlerOptions) => GraphQLHandler;
type GraphQLResponseResolver<Query extends GraphQLQuery = GraphQLQuery, Variables extends GraphQLVariables = GraphQLVariables> = ResponseResolver<GraphQLResolverExtras<Variables>, null, GraphQLResponseBody<[Query] extends [never] ? GraphQLQuery : Query>>;
declare const standardGraphQLHandlers: {
    /**
     * Intercepts a GraphQL query by a given name.
     *
     * @example
     * graphql.query('GetUser', () => {
     *   return HttpResponse.json({ data: { user: { name: 'John' } } })
     * })
     *
     * @see {@link https://mswjs.io/docs/api/graphql#graphqlqueryqueryname-resolver `graphql.query()` API reference}
     */
    query: GraphQLRequestHandler;
    /**
     * Intercepts a GraphQL mutation by its name.
     *
     * @example
     * graphql.mutation('SavePost', () => {
     *   return HttpResponse.json({ data: { post: { id: 'abc-123 } } })
     * })
     *
     * @see {@link https://mswjs.io/docs/api/graphql#graphqlmutationmutationname-resolver `graphql.query()` API reference}
     *
     */
    mutation: GraphQLRequestHandler;
    /**
     * Intercepts any GraphQL operation, regardless of its type or name.
     *
     * @example
     * graphql.operation(() => {
     *   return HttpResponse.json({ data: { name: 'John' } })
     * })
     *
     * @see {@link https://mswjs.io/docs/api/graphql#graphqloperationresolver `graphql.operation()` API reference}
     */
    operation: <Query extends GraphQLQuery = GraphQLQuery, Variables extends GraphQLVariables = GraphQLVariables>(resolver: ResponseResolver<GraphQLResolverExtras<Variables>, null, GraphQLResponseBody<Query>>) => GraphQLHandler;
};
declare function createGraphQLLink(url: Path): typeof standardGraphQLHandlers;
/**
 * A namespace to intercept and mock GraphQL operations
 *
 * @example
 * graphql.query('GetUser', resolver)
 * graphql.mutation('DeletePost', resolver)
 *
 * @see {@link https://mswjs.io/docs/api/graphql `graphql` API reference}
 */
declare const graphql: {
    /**
     * Intercepts GraphQL operations scoped by the given URL.
     *
     * @example
     * const github = graphql.link('https://api.github.com/graphql')
     * github.query('GetRepo', resolver)
     *
     * @see {@link https://mswjs.io/docs/api/graphql#graphqllinkurl `graphql.link()` API reference}
     */
    link: typeof createGraphQLLink;
    /**
     * Intercepts a GraphQL query by a given name.
     *
     * @example
     * graphql.query('GetUser', () => {
     *   return HttpResponse.json({ data: { user: { name: 'John' } } })
     * })
     *
     * @see {@link https://mswjs.io/docs/api/graphql#graphqlqueryqueryname-resolver `graphql.query()` API reference}
     */
    query: GraphQLRequestHandler;
    /**
     * Intercepts a GraphQL mutation by its name.
     *
     * @example
     * graphql.mutation('SavePost', () => {
     *   return HttpResponse.json({ data: { post: { id: 'abc-123 } } })
     * })
     *
     * @see {@link https://mswjs.io/docs/api/graphql#graphqlmutationmutationname-resolver `graphql.query()` API reference}
     *
     */
    mutation: GraphQLRequestHandler;
    /**
     * Intercepts any GraphQL operation, regardless of its type or name.
     *
     * @example
     * graphql.operation(() => {
     *   return HttpResponse.json({ data: { name: 'John' } })
     * })
     *
     * @see {@link https://mswjs.io/docs/api/graphql#graphqloperationresolver `graphql.operation()` API reference}
     */
    operation: <Query extends GraphQLQuery = GraphQLQuery, Variables extends GraphQLVariables = GraphQLVariables>(resolver: ResponseResolver<GraphQLResolverExtras<Variables>, null, GraphQLResponseBody<Query>>) => GraphQLHandler;
};

export { type GraphQLRequestHandler, type GraphQLResponseResolver, type TypedDocumentNode, graphql };
