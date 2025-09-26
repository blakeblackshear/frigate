import type { Context } from 'react';
import type { ReactReduxContextValue } from 'react-redux';
import { setupListeners } from '@reduxjs/toolkit/query';
import type { Api } from '@reduxjs/toolkit/query';
/**
 * Can be used as a `Provider` if you **do not already have a Redux store**.
 *
 * @example
 * ```tsx
 * // codeblock-meta no-transpile title="Basic usage - wrap your App with ApiProvider"
 * import * as React from 'react';
 * import { ApiProvider } from '@reduxjs/toolkit/query/react';
 * import { Pokemon } from './features/Pokemon';
 *
 * function App() {
 *   return (
 *     <ApiProvider api={api}>
 *       <Pokemon />
 *     </ApiProvider>
 *   );
 * }
 * ```
 *
 * @remarks
 * Using this together with an existing redux store, both will
 * conflict with each other - please use the traditional redux setup
 * in that case.
 */
export declare function ApiProvider<A extends Api<any, {}, any, any>>(props: {
    children: any;
    api: A;
    setupListeners?: Parameters<typeof setupListeners>[1] | false;
    context?: Context<ReactReduxContextValue>;
}): JSX.Element;
