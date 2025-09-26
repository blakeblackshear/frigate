/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useContext } from 'react';
export const createStatefulBrokenLinks = () => {
    // Set to dedup, as it's not useful to collect multiple times the same value
    const allAnchors = new Set();
    const allLinks = new Set();
    return {
        collectAnchor: (anchor) => {
            typeof anchor !== 'undefined' && allAnchors.add(anchor);
        },
        collectLink: (link) => {
            typeof link !== 'undefined' && allLinks.add(link);
        },
        getCollectedAnchors: () => [...allAnchors],
        getCollectedLinks: () => [...allLinks],
    };
};
const Context = React.createContext({
    collectAnchor: () => {
        // No-op for client
    },
    collectLink: () => {
        // No-op for client
    },
});
export const useBrokenLinksContext = () => useContext(Context);
export function BrokenLinksProvider({ children, brokenLinks, }) {
    return <Context.Provider value={brokenLinks}>{children}</Context.Provider>;
}
