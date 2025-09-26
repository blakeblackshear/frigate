/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useCallback, useMemo, useRef, } from 'react';
import useIsomorphicLayoutEffect from '@docusaurus/useIsomorphicLayoutEffect';
/**
 * Temporary userland implementation until an official hook is implemented
 * See RFC: https://github.com/reactjs/rfcs/pull/220
 *
 * Permits to transform an unstable callback (like an arrow function provided as
 * props) to a "stable" callback that is safe to use in a `useEffect` dependency
 * array. Useful to avoid React stale closure problems + avoid useless effect
 * re-executions.
 *
 * This generally works but has some potential drawbacks, such as
 * https://github.com/facebook/react/issues/16956#issuecomment-536636418
 */
export function useEvent(callback) {
    const ref = useRef(callback);
    useIsomorphicLayoutEffect(() => {
        ref.current = callback;
    }, [callback]);
    // @ts-expect-error: TS is right that this callback may be a supertype of T,
    // but good enough for our use
    return useCallback((...args) => ref.current(...args), []);
}
/**
 * Gets `value` from the last render.
 */
export function usePrevious(value) {
    const ref = useRef();
    useIsomorphicLayoutEffect(() => {
        ref.current = value;
    });
    // TODO need to fix this React Compiler lint error
    //  probably requires changing the API though
    // eslint-disable-next-line react-compiler/react-compiler
    return ref.current;
}
/**
 * This error is thrown when a context is consumed outside its provider. Allows
 * reusing a generic error message format and reduces bundle size. The hook's
 * name will be extracted from its stack, so only the provider's name is needed.
 */
export class ReactContextError extends Error {
    constructor(providerName, additionalInfo) {
        super();
        this.name = 'ReactContextError';
        this.message = `Hook ${this.stack?.split('\n')[1]?.match(/at (?:\w+\.)?(?<name>\w+)/)?.groups
            .name ?? ''} is called outside the <${providerName}>. ${additionalInfo ?? ''}`;
    }
}
/**
 * Shallow-memoize an object. This means the returned object will be the same as
 * the previous render if the property keys and values did not change. This
 * works for simple cases: when property values are primitives or stable
 * objects.
 *
 * @param obj
 */
export function useShallowMemoObject(obj) {
    const deps = Object.entries(obj);
    // Sort by keys to make it order-insensitive
    deps.sort((a, b) => a[0].localeCompare(b[0]));
    // eslint-disable-next-line react-compiler/react-compiler,react-hooks/exhaustive-deps
    return useMemo(() => obj, deps.flat());
}
/**
 * Creates a single React provider from an array of existing providers
 * assuming providers only take "children" as props.
 *
 * Prevents the annoying React element nesting
 * Example here: https://getfrontend.tips/compose-multiple-react-providers/
 *
 * The order matters:
 * - The first provider is at the top of the tree.
 * - The last provider is the most nested one
 *
 * @param providers array of providers to compose
 */
export function composeProviders(providers) {
    // Creates a single React component: it's cheaper to compose JSX elements
    return ({ children }) => (<>
      {providers.reduceRight((element, CurrentProvider) => (<CurrentProvider>{element}</CurrentProvider>), children)}
    </>);
}
//# sourceMappingURL=reactUtils.js.map