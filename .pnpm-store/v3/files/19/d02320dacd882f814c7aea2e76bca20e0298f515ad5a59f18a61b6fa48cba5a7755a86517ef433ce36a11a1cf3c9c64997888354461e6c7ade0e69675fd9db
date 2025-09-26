/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import clientModules from '@generated/client-modules';
import useIsomorphicLayoutEffect from './exports/useIsomorphicLayoutEffect';
export function dispatchLifecycleAction(lifecycleAction, ...args) {
    const callbacks = clientModules.map((clientModule) => {
        const lifecycleFunction = (clientModule.default?.[lifecycleAction] ??
            clientModule[lifecycleAction]);
        return lifecycleFunction?.(...args);
    });
    return () => callbacks.forEach((cb) => cb?.());
}
function scrollAfterNavigation({ location, previousLocation, }) {
    if (!previousLocation) {
        return; // no-op: use native browser feature
    }
    const samePathname = location.pathname === previousLocation.pathname;
    const sameHash = location.hash === previousLocation.hash;
    const sameSearch = location.search === previousLocation.search;
    // Query-string changes: do not scroll to top/hash
    if (samePathname && sameHash && !sameSearch) {
        return;
    }
    const { hash } = location;
    if (!hash) {
        window.scrollTo(0, 0);
    }
    else {
        const id = decodeURIComponent(hash.substring(1));
        const element = document.getElementById(id);
        element?.scrollIntoView();
    }
}
function ClientLifecyclesDispatcher({ children, location, previousLocation, }) {
    useIsomorphicLayoutEffect(() => {
        if (previousLocation !== location) {
            scrollAfterNavigation({ location, previousLocation });
            dispatchLifecycleAction('onRouteDidUpdate', { previousLocation, location });
        }
    }, [previousLocation, location]);
    return children;
}
export default ClientLifecyclesDispatcher;
