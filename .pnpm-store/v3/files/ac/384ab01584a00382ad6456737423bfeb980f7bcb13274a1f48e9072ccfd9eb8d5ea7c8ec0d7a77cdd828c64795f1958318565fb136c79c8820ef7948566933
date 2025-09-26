/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode } from 'react';
type PageMetadataProps = {
    readonly title?: string;
    readonly description?: string;
    readonly keywords?: readonly string[] | string;
    readonly image?: string;
    readonly children?: ReactNode;
};
/**
 * Helper component to manipulate page metadata and override site defaults.
 * Works in the same way as Helmet.
 */
export declare function PageMetadata({ title, description, keywords, image, children, }: PageMetadataProps): ReactNode;
/**
 * Every layer of this provider will append a class name to the HTML element.
 * There's no consumer for this hook: it's side-effect-only. This wrapper is
 * necessary because Helmet does not "merge" classes.
 * @see https://github.com/staylor/react-helmet-async/issues/161
 */
export declare function HtmlClassNameProvider({ className: classNameProp, children, }: {
    className: string;
    children: ReactNode;
}): ReactNode;
/**
 * A very thin wrapper around `HtmlClassNameProvider` that adds the plugin ID +
 * name to the HTML class name.
 */
export declare function PluginHtmlClassNameProvider({ children, }: {
    children: ReactNode;
}): ReactNode;
export {};
//# sourceMappingURL=metadataUtils.d.ts.map