/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { PrismTheme } from 'prism-react-renderer';
import type { DeepPartial } from 'utility-types';
import type { MagicCommentConfig } from './codeBlockUtils';
import type { ColorMode } from '../contexts/colorMode';
export type DocsVersionPersistence = 'localStorage' | 'none';
export type NavbarItem = {
    type?: string;
    items?: NavbarItem[];
    label?: string;
    position?: 'left' | 'right';
} & {
    [key: string]: unknown;
};
type BaseLogo = {
    alt?: string;
    src: string;
    srcDark?: string;
    href?: string;
    width?: string | number;
    height?: string | number;
    target?: string;
    style?: object;
    className?: string;
};
export type NavbarLogo = BaseLogo;
export type Navbar = {
    style?: 'dark' | 'primary';
    hideOnScroll: boolean;
    title?: string;
    items: NavbarItem[];
    logo?: NavbarLogo;
};
export type ColorModeConfig = {
    defaultMode: ColorMode;
    disableSwitch: boolean;
    respectPrefersColorScheme: boolean;
};
export type AnnouncementBarConfig = {
    id: string;
    content: string;
    backgroundColor: string;
    textColor: string;
    isCloseable: boolean;
};
export type PrismConfig = {
    theme: PrismTheme;
    darkTheme?: PrismTheme;
    defaultLanguage?: string;
    additionalLanguages: string[];
    magicComments: MagicCommentConfig[];
};
export type FooterLinkItem = {
    label?: string;
    className?: string;
    to?: string;
    href?: string;
    html?: string;
    prependBaseUrlToHref?: string;
} & {
    [key: string]: unknown;
};
export type FooterColumnItem = {
    title: string | null;
    className?: string;
    items: FooterLinkItem[];
};
export type FooterLogo = BaseLogo;
export type FooterBase = {
    style: 'light' | 'dark';
    logo?: FooterLogo;
    copyright?: string;
};
export type MultiColumnFooter = FooterBase & {
    links: FooterColumnItem[];
};
export type SimpleFooter = FooterBase & {
    links: FooterLinkItem[];
};
export type Footer = MultiColumnFooter | SimpleFooter;
export type TableOfContents = {
    minHeadingLevel: number;
    maxHeadingLevel: number;
};
export type ThemeConfig = {
    docs: {
        versionPersistence: DocsVersionPersistence;
        sidebar: {
            hideable: boolean;
            autoCollapseCategories: boolean;
        };
    };
    blog: {
        sidebar: {
            groupByYear: boolean;
        };
    };
    navbar: Navbar;
    colorMode: ColorModeConfig;
    announcementBar?: AnnouncementBarConfig;
    prism: PrismConfig;
    footer?: Footer;
    image?: string;
    metadata: {
        [key: string]: string;
    }[];
    tableOfContents: TableOfContents;
};
export type UserThemeConfig = DeepPartial<ThemeConfig>;
/**
 * A convenient/more semantic way to get theme config from context.
 */
export declare function useThemeConfig(): ThemeConfig;
export {};
//# sourceMappingURL=useThemeConfig.d.ts.map