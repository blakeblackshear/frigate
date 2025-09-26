/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { ReactNode } from 'react';
type TitleFormatterParams = {
    /**
     * The page title to format
     * Usually provided with these APIs:
     * - <PageMetadata title={title}>
     * - useTitleFormatter().format(title)
     */
    title: string;
    /**
     * The siteConfig.title value
     */
    siteTitle: string;
    /**
     * The siteConfig.titleDelimiter value
     */
    titleDelimiter: string;
    /**
     * The plugin that created the page you are on
     */
    plugin: {
        id: string;
        name: string;
    };
};
/**
 * This is the full formatting function, including all useful params
 * Can be customized through React context with the provider
 */
export type TitleFormatterFn = (params: TitleFormatterParams) => string;
/**
 * The default formatter is provided in params for convenience
 */
export type TitleFormatterFnWithDefault = (params: TitleFormatterParams & {
    defaultFormatter: (params: TitleFormatterParams) => string;
}) => string;
export declare const TitleFormatterFnDefault: TitleFormatterFn;
/**
 * This is the simpler API exposed to theme/users
 */
type TitleFormatter = {
    format: (title: string) => string;
};
export declare function TitleFormatterProvider({ formatter, children, }: {
    children: ReactNode;
    formatter: TitleFormatterFnWithDefault;
}): ReactNode;
/**
 * Returns a function to format the page title
 */
export declare function useTitleFormatter(): TitleFormatter;
export {};
//# sourceMappingURL=titleFormatterUtils.d.ts.map