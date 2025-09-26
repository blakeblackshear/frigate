/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useState, useContext, useEffect, useMemo, useCallback, } from 'react';
import { ReactContextError, usePrevious } from '../../utils/reactUtils';
import { useNavbarMobileSidebar } from '../navbarMobileSidebar';
import { useNavbarSecondaryMenuContent } from './content';
const Context = React.createContext(null);
function useContextValue() {
    const mobileSidebar = useNavbarMobileSidebar();
    const content = useNavbarSecondaryMenuContent();
    const [shown, setShown] = useState(false);
    const hasContent = content.component !== null;
    const previousHasContent = usePrevious(hasContent);
    // When content is become available for the first time (set in useEffect)
    // we set this content to be shown!
    useEffect(() => {
        const contentBecameAvailable = hasContent && !previousHasContent;
        if (contentBecameAvailable) {
            setShown(true);
        }
    }, [hasContent, previousHasContent]);
    // On sidebar close, secondary menu is set to be shown on next re-opening
    // (if any secondary menu content available)
    useEffect(() => {
        if (!hasContent) {
            setShown(false);
            return;
        }
        if (!mobileSidebar.shown) {
            setShown(true);
        }
    }, [mobileSidebar.shown, hasContent]);
    return useMemo(() => [shown, setShown], [shown]);
}
/** @internal */
export function NavbarSecondaryMenuDisplayProvider({ children, }) {
    const value = useContextValue();
    return <Context.Provider value={value}>{children}</Context.Provider>;
}
function renderElement(content) {
    if (content.component) {
        const Comp = content.component;
        return <Comp {...content.props}/>;
    }
    return undefined;
}
/** Wires the logic for rendering the mobile navbar secondary menu. */
export function useNavbarSecondaryMenu() {
    const value = useContext(Context);
    if (!value) {
        throw new ReactContextError('NavbarSecondaryMenuDisplayProvider');
    }
    const [shown, setShown] = value;
    const hide = useCallback(() => setShown(false), [setShown]);
    const content = useNavbarSecondaryMenuContent();
    return useMemo(() => ({ shown, hide, content: renderElement(content) }), [hide, content, shown]);
}
//# sourceMappingURL=display.js.map