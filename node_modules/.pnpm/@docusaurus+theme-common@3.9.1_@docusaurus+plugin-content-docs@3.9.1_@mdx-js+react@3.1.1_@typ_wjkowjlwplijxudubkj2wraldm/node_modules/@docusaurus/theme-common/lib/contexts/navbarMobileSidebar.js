/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useCallback, useEffect, useState, useMemo, } from 'react';
import { useNavbarSecondaryMenuContent } from './navbarSecondaryMenu/content';
import { useWindowSize } from '../hooks/useWindowSize';
import { useHistoryPopHandler } from '../utils/historyUtils';
import { useThemeConfig } from '../utils/useThemeConfig';
import { ReactContextError } from '../utils/reactUtils';
const Context = React.createContext(undefined);
function useIsNavbarMobileSidebarDisabled() {
    const secondaryMenuContent = useNavbarSecondaryMenuContent();
    const { items } = useThemeConfig().navbar;
    return items.length === 0 && !secondaryMenuContent.component;
}
function useContextValue() {
    const disabled = useIsNavbarMobileSidebarDisabled();
    const windowSize = useWindowSize();
    const shouldRender = !disabled && windowSize === 'mobile';
    const [shown, setShown] = useState(false);
    const toggle = useCallback(() => {
        setShown((s) => !s);
    }, []);
    useEffect(() => {
        if (windowSize === 'desktop') {
            setShown(false);
        }
    }, [windowSize]);
    return useMemo(() => ({ disabled, shouldRender, toggle, shown }), [disabled, shouldRender, toggle, shown]);
}
// A component hook wrapper enables conditional rendering
// See reason here: https://github.com/facebook/docusaurus/issues/10988
function OnHistoryPop({ handler, }) {
    useHistoryPopHandler(handler);
    return null;
}
export function NavbarMobileSidebarProvider({ children, }) {
    const value = useContextValue();
    return (<>
      {
        // Close mobile sidebar on navigation pop
        // Most likely firing when using the Android back button (but not only)
        // Important: we can only have a single history blocker at a time
        // That's why this needs to be rendered conditionally
        // See bug report https://github.com/facebook/docusaurus/issues/10988
        value.shown && (<OnHistoryPop handler={() => {
                value.toggle();
                // Prevent pop navigation; seems desirable enough
                // See https://github.com/facebook/docusaurus/pull/5462#issuecomment-911699846
                return false;
            }}/>)}
      <Context.Provider value={value}>{children}</Context.Provider>
    </>);
}
export function useNavbarMobileSidebar() {
    const context = React.useContext(Context);
    if (context === undefined) {
        throw new ReactContextError('NavbarMobileSidebarProvider');
    }
    return context;
}
//# sourceMappingURL=navbarMobileSidebar.js.map