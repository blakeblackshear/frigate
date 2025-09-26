/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { createContext, useContext } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useRouteContext from '@docusaurus/useRouteContext';
import { ReactContextError } from './reactUtils';
export const TitleFormatterFnDefault = ({ title, siteTitle, titleDelimiter, }) => {
    const trimmedTitle = title?.trim();
    if (!trimmedTitle || trimmedTitle === siteTitle) {
        return siteTitle;
    }
    return `${trimmedTitle} ${titleDelimiter} ${siteTitle}`;
};
const TitleFormatterContext = createContext(null);
export function TitleFormatterProvider({ formatter, children, }) {
    return (<TitleFormatterContext.Provider value={formatter}>
      {children}
    </TitleFormatterContext.Provider>);
}
function useTitleFormatterContext() {
    const value = useContext(TitleFormatterContext);
    if (value === null) {
        throw new ReactContextError('TitleFormatterProvider');
    }
    return value;
}
/**
 * Returns a function to format the page title
 */
export function useTitleFormatter() {
    const formatter = useTitleFormatterContext();
    const { siteConfig } = useDocusaurusContext();
    const { title: siteTitle, titleDelimiter } = siteConfig;
    // Unfortunately we can only call this hook here, not in the provider
    // Route context can't be accessed in any provider applied above the router
    const { plugin } = useRouteContext();
    return {
        format: (title) => formatter({
            title,
            siteTitle,
            titleDelimiter,
            plugin,
            defaultFormatter: TitleFormatterFnDefault,
        }),
    };
}
//# sourceMappingURL=titleFormatterUtils.js.map