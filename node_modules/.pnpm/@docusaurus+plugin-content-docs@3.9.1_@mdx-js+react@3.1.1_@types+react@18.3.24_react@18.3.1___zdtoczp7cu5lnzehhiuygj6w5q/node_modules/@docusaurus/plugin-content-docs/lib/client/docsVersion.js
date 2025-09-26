/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useContext } from 'react';
import { ReactContextError } from '@docusaurus/theme-common/internal';
const Context = React.createContext(null);
/**
 * Provide the current version's metadata to your children.
 */
export function DocsVersionProvider({ children, version, }) {
    return <Context.Provider value={version}>{children}</Context.Provider>;
}
/**
 * Gets the version metadata of the current doc page.
 */
export function useDocsVersion() {
    const version = useContext(Context);
    if (version === null) {
        throw new ReactContextError('DocsVersionProvider');
    }
    return version;
}
