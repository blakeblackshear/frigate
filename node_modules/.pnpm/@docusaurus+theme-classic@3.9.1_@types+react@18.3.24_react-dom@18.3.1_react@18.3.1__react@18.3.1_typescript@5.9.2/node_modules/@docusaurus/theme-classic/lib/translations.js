"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTranslationFiles = getTranslationFiles;
exports.translateThemeConfig = translateThemeConfig;
const tslib_1 = require("tslib");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("@docusaurus/utils");
function getNavbarTranslationFile(navbar) {
    // TODO handle properly all the navbar item types here!
    function flattenNavbarItems(items) {
        const subItems = items.flatMap((item) => {
            const allSubItems = [item.items ?? []].flat();
            return flattenNavbarItems(allSubItems);
        });
        return [...items, ...subItems];
    }
    const allNavbarItems = flattenNavbarItems(navbar.items);
    const navbarItemsTranslations = Object.fromEntries(allNavbarItems
        .filter((navbarItem) => navbarItem.label)
        .map((navbarItem) => [
        `item.label.${navbarItem.label}`,
        {
            message: navbarItem.label,
            description: `Navbar item with label ${navbarItem.label}`,
        },
    ]));
    const titleTranslations = navbar.title
        ? { title: { message: navbar.title, description: 'The title in the navbar' } }
        : {};
    const logoAlt = navbar.logo?.alt
        ? {
            'logo.alt': {
                message: navbar.logo.alt,
                description: 'The alt text of navbar logo',
            },
        }
        : {};
    return (0, utils_1.mergeTranslations)([
        titleTranslations,
        logoAlt,
        navbarItemsTranslations,
    ]);
}
function translateNavbar(navbar, navbarTranslations) {
    if (!navbarTranslations) {
        return navbar;
    }
    const logo = navbar.logo
        ? {
            ...navbar.logo,
            alt: navbarTranslations[`logo.alt`]?.message ?? navbar.logo?.alt,
        }
        : undefined;
    return {
        ...navbar,
        title: navbarTranslations.title?.message ?? navbar.title,
        logo,
        //  TODO handle properly all the navbar item types here!
        items: navbar.items.map((item) => {
            const subItems = item.items?.map((subItem) => ({
                ...subItem,
                label: navbarTranslations[`item.label.${subItem.label}`]?.message ??
                    subItem.label,
            }));
            return {
                ...item,
                label: navbarTranslations[`item.label.${item.label}`]?.message ?? item.label,
                ...(subItems ? { items: subItems } : undefined),
            };
        }),
    };
}
function isMultiColumnFooterLinks(links) {
    return links.length > 0 && 'title' in links[0];
}
function getFooterTranslationFile(footer) {
    const footerLinkTitles = Object.fromEntries((isMultiColumnFooterLinks(footer.links)
        ? footer.links.filter((link) => link.title)
        : []).map((link) => [
        `link.title.${link.title}`,
        {
            message: link.title,
            description: `The title of the footer links column with title=${link.title} in the footer`,
        },
    ]));
    const footerLinkLabels = Object.fromEntries((isMultiColumnFooterLinks(footer.links)
        ? footer.links.flatMap((link) => link.items).filter((link) => link.label)
        : footer.links.filter((link) => link.label)).map((link) => [
        `link.item.label.${link.label}`,
        {
            message: link.label,
            description: `The label of footer link with label=${link.label} linking to ${link.to ?? link.href}`,
        },
    ]));
    const copyright = footer.copyright
        ? {
            copyright: {
                message: footer.copyright,
                description: 'The footer copyright',
            },
        }
        : {};
    const logoAlt = footer.logo?.alt
        ? {
            'logo.alt': {
                message: footer.logo.alt,
                description: 'The alt text of footer logo',
            },
        }
        : {};
    return (0, utils_1.mergeTranslations)([
        footerLinkTitles,
        footerLinkLabels,
        copyright,
        logoAlt,
    ]);
}
function translateFooter(footer, footerTranslations) {
    if (!footerTranslations) {
        return footer;
    }
    const links = isMultiColumnFooterLinks(footer.links)
        ? footer.links.map((link) => ({
            ...link,
            title: footerTranslations[`link.title.${link.title}`]?.message ?? link.title,
            items: link.items.map((linkItem) => ({
                ...linkItem,
                label: footerTranslations[`link.item.label.${linkItem.label}`]?.message ??
                    linkItem.label,
            })),
        }))
        : footer.links.map((link) => ({
            ...link,
            label: footerTranslations[`link.item.label.${link.label}`]?.message ??
                link.label,
        }));
    const copyright = footerTranslations.copyright?.message ?? footer.copyright;
    const logo = footer.logo
        ? {
            ...footer.logo,
            alt: footerTranslations[`logo.alt`]?.message ?? footer.logo?.alt,
        }
        : undefined;
    return {
        ...footer,
        links,
        copyright,
        logo,
    };
}
function getTranslationFiles({ themeConfig, }) {
    const translationFiles = [
        { path: 'navbar', content: getNavbarTranslationFile(themeConfig.navbar) },
        themeConfig.footer
            ? {
                path: 'footer',
                content: getFooterTranslationFile(themeConfig.footer),
            }
            : undefined,
    ];
    return translationFiles.filter(Boolean);
}
function translateThemeConfig({ themeConfig, translationFiles, }) {
    const translationFilesMap = lodash_1.default.keyBy(translationFiles, (f) => f.path);
    return {
        ...themeConfig,
        navbar: translateNavbar(themeConfig.navbar, translationFilesMap.navbar?.content),
        footer: themeConfig.footer
            ? translateFooter(themeConfig.footer, translationFilesMap.footer?.content)
            : undefined,
    };
}
