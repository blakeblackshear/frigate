/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode } from 'react';
import type { PropSidebar } from '@docusaurus/plugin-content-docs';
type ContextValue = {
    name: string;
    items: PropSidebar;
};
/**
 * Provide the current sidebar to your children.
 */
export declare function DocsSidebarProvider({ children, name, items, }: {
    children: ReactNode;
    name: string | undefined;
    items: PropSidebar | undefined;
}): ReactNode;
/**
 * Gets the sidebar that's currently displayed, or `null` if there isn't one
 */
export declare function useDocsSidebar(): ContextValue | null;
export {};
