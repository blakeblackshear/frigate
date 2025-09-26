/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode } from 'react';
import { type GlobalVersion } from '@docusaurus/plugin-content-docs/client';
/**
 * This is a maybe-layer. If the docs plugin is not enabled, this provider is a
 * simple pass-through.
 */
export declare function DocsPreferredVersionContextProvider({ children, }: {
    children: ReactNode;
}): ReactNode;
/**
 * Returns a read-write interface to a plugin's preferred version. The
 * "preferred version" is defined as the last version that the user visited.
 * For example, if a user is using v3, even when v4 is later published, the user
 * would still be browsing v3 docs when she opens the website next time. Note,
 * the `preferredVersion` attribute will always be `null` before mount.
 */
export declare function useDocsPreferredVersion(pluginId?: string | undefined): {
    preferredVersion: GlobalVersion | null;
    savePreferredVersionName: (versionName: string) => void;
};
export declare function useDocsPreferredVersionByPluginId(): {
    [pluginId: string]: GlobalVersion | null;
};
