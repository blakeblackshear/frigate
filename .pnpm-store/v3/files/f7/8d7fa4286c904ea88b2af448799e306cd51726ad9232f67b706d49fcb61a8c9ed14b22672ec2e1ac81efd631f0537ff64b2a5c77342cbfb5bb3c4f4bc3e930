/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode } from 'react';
type ContextValue = {
    /**
     * Mobile sidebar should be disabled in case it's empty, i.e. no secondary
     * menu + no navbar items). If disabled, the toggle button should not be
     * displayed at all.
     */
    disabled: boolean;
    /**
     * Signals whether the actual sidebar should be displayed (contrary to
     * `disabled` which is about the toggle button). Sidebar should not visible
     * until user interaction to avoid SSR rendering.
     */
    shouldRender: boolean;
    /** The displayed state. Can be toggled with the `toggle` callback. */
    shown: boolean;
    /** Toggle the `shown` attribute. */
    toggle: () => void;
};
export declare function NavbarMobileSidebarProvider({ children, }: {
    children: ReactNode;
}): ReactNode;
export declare function useNavbarMobileSidebar(): ContextValue;
export {};
//# sourceMappingURL=navbarMobileSidebar.d.ts.map