/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useMemo, useState, useContext } from 'react';
import { ReactContextError } from '@docusaurus/theme-common/internal';
const EmptyContext = Symbol('EmptyContext');
const Context = React.createContext(EmptyContext);
/**
 * Should be used to wrap one sidebar category level. This provider syncs the
 * expanded states of all sibling categories, and categories can choose to
 * collapse itself if another one is expanded.
 */
export function DocSidebarItemsExpandedStateProvider({ children, }) {
    const [expandedItem, setExpandedItem] = useState(null);
    const contextValue = useMemo(() => ({ expandedItem, setExpandedItem }), [expandedItem]);
    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}
export function useDocSidebarItemsExpandedState() {
    const value = useContext(Context);
    if (value === EmptyContext) {
        throw new ReactContextError('DocSidebarItemsExpandedStateProvider');
    }
    return value;
}
