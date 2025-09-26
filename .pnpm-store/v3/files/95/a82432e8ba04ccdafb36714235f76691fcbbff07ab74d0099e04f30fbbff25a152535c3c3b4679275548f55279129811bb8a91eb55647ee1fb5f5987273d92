/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useState, useContext, useEffect, } from 'react';
import { ReactContextError, useShallowMemoObject } from '../../utils/reactUtils';
const Context = React.createContext(null);
/** @internal */
export function NavbarSecondaryMenuContentProvider({ children, }) {
    const value = useState({ component: null, props: null });
    return (
    // @ts-expect-error: this context is hard to type
    <Context.Provider value={value}>{children}</Context.Provider>);
}
/** @internal */
export function useNavbarSecondaryMenuContent() {
    const value = useContext(Context);
    if (!value) {
        throw new ReactContextError('NavbarSecondaryMenuContentProvider');
    }
    return value[0];
}
/**
 * This component renders nothing by itself, but it fills the placeholder in the
 * generic secondary menu layout. This reduces coupling between the main layout
 * and the specific page.
 *
 * This kind of feature is often called portal/teleport/gateway/outlet...
 * Various unmaintained React libs exist. Most up-to-date one:
 * https://github.com/gregberge/react-teleporter
 * Not sure any of those is safe regarding concurrent mode.
 */
export function NavbarSecondaryMenuFiller({ component, props, }) {
    const context = useContext(Context);
    if (!context) {
        throw new ReactContextError('NavbarSecondaryMenuContentProvider');
    }
    const [, setContent] = context;
    // To avoid useless context re-renders, props are memoized shallowly
    const memoizedProps = useShallowMemoObject(props);
    useEffect(() => {
        // @ts-expect-error: this context is hard to type
        setContent({ component, props: memoizedProps });
    }, [setContent, component, memoizedProps]);
    useEffect(() => () => setContent({ component: null, props: null }), [setContent]);
    return null;
}
//# sourceMappingURL=content.js.map