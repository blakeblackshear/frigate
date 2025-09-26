/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useMemo, useContext } from 'react';
import { ReactContextError } from '@docusaurus/theme-common/internal';
// Using a Symbol because null is a valid context value (a doc with no sidebar)
// Inspired by https://github.com/jamiebuilds/unstated-next/blob/master/src/unstated-next.tsx
const EmptyContext = Symbol('EmptyContext');
const Context = React.createContext(EmptyContext);
/**
 * Provide the current sidebar to your children.
 */
export function DocsSidebarProvider({ children, name, items, }) {
    const stableValue = useMemo(() => (name && items ? { name, items } : null), [name, items]);
    return <Context.Provider value={stableValue}>{children}</Context.Provider>;
}
/**
 * Gets the sidebar that's currently displayed, or `null` if there isn't one
 */
export function useDocsSidebar() {
    const value = useContext(Context);
    if (value === EmptyContext) {
        throw new ReactContextError('DocsSidebarProvider');
    }
    return value;
}
