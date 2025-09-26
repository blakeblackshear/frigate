import {
  GraphQLHandler
} from './handlers/GraphQLHandler.mjs';
function createScopedGraphQLHandler(operationType, url) {
  return (predicate, resolver, options = {}) => {
    return new GraphQLHandler(operationType, predicate, url, resolver, options);
  };
}
function createGraphQLOperationHandler(url) {
  return (resolver) => {
    return new GraphQLHandler("all", new RegExp(".*"), url, resolver);
  };
}
const standardGraphQLHandlers = {
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
  query: createScopedGraphQLHandler("query", "*"),
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
  mutation: createScopedGraphQLHandler("mutation", "*"),
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
  operation: createGraphQLOperationHandler("*")
};
function createGraphQLLink(url) {
  return {
    operation: createGraphQLOperationHandler(url),
    query: createScopedGraphQLHandler("query", url),
    mutation: createScopedGraphQLHandler("mutation", url)
  };
}
const graphql = {
  ...standardGraphQLHandlers,
  /**
   * Intercepts GraphQL operations scoped by the given URL.
   *
   * @example
   * const github = graphql.link('https://api.github.com/graphql')
   * github.query('GetRepo', resolver)
   *
   * @see {@link https://mswjs.io/docs/api/graphql#graphqllinkurl `graphql.link()` API reference}
   */
  link: createGraphQLLink
};
export {
  graphql
};
//# sourceMappingURL=graphql.mjs.map