/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { type ReactNode } from 'react';
declare const AllThemes: readonly ["light", "dark"];
type Theme = (typeof AllThemes)[number];
type RenderFn = ({ theme, className, }: {
    theme: Theme;
    className: string;
}) => React.ReactNode;
type Props = {
    children: RenderFn;
    className?: string;
};
/**
 * Generic component to render anything themed in light/dark
 * Note: it's preferable to use CSS for theming because this component
 * will need to render all the variants during SSR to avoid a theme flash.
 *
 * Use this only when CSS customizations are not convenient or impossible.
 * For example, rendering themed images or SVGs...
 *
 * @param className applied to all the variants
 * @param children function to render a theme variant
 * @constructor
 */
export default function ThemedComponent({ className, children, }: Props): ReactNode;
export {};
//# sourceMappingURL=index.d.ts.map