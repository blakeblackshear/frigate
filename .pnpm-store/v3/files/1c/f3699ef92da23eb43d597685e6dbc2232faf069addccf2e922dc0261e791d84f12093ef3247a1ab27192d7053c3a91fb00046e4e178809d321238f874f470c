/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode, type ComponentType } from 'react';
export type NavbarSecondaryMenuComponent<Props> = ComponentType<Props>;
/** @internal */
export type Content = {
    component: NavbarSecondaryMenuComponent<object>;
    props: object;
} | {
    component: null;
    props: null;
};
/** @internal */
export declare function NavbarSecondaryMenuContentProvider({ children, }: {
    children: ReactNode;
}): ReactNode;
/** @internal */
export declare function useNavbarSecondaryMenuContent(): Content;
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
export declare function NavbarSecondaryMenuFiller<P extends object>({ component, props, }: {
    component: NavbarSecondaryMenuComponent<P>;
    props: P;
}): ReactNode;
//# sourceMappingURL=content.d.ts.map