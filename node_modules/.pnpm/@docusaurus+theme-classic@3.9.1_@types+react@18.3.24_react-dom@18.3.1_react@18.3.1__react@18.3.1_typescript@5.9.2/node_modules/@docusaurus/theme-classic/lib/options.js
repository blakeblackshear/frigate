"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeConfigSchema = exports.DEFAULT_CONFIG = void 0;
exports.validateThemeConfig = validateThemeConfig;
exports.validateOptions = validateOptions;
const prism_react_renderer_1 = require("prism-react-renderer");
const utils_validation_1 = require("@docusaurus/utils-validation");
const defaultPrismTheme = prism_react_renderer_1.themes.palenight;
const DEFAULT_DOCS_CONFIG = {
    versionPersistence: 'localStorage',
    sidebar: {
        hideable: false,
        autoCollapseCategories: false,
    },
};
const DocsSchema = utils_validation_1.Joi.object({
    versionPersistence: utils_validation_1.Joi.string()
        .equal('localStorage', 'none')
        .default(DEFAULT_DOCS_CONFIG.versionPersistence),
    sidebar: utils_validation_1.Joi.object({
        hideable: utils_validation_1.Joi.bool().default(DEFAULT_DOCS_CONFIG.sidebar.hideable),
        autoCollapseCategories: utils_validation_1.Joi.bool().default(DEFAULT_DOCS_CONFIG.sidebar.autoCollapseCategories),
    }).default(DEFAULT_DOCS_CONFIG.sidebar),
}).default(DEFAULT_DOCS_CONFIG);
const DEFAULT_BLOG_CONFIG = {
    sidebar: {
        groupByYear: true,
    },
};
const BlogSchema = utils_validation_1.Joi.object({
    sidebar: utils_validation_1.Joi.object({
        groupByYear: utils_validation_1.Joi.bool().default(DEFAULT_BLOG_CONFIG.sidebar.groupByYear),
    }).default(DEFAULT_BLOG_CONFIG.sidebar),
}).default(DEFAULT_BLOG_CONFIG);
const DEFAULT_COLOR_MODE_CONFIG = {
    defaultMode: 'light',
    disableSwitch: false,
    respectPrefersColorScheme: false,
};
exports.DEFAULT_CONFIG = {
    colorMode: DEFAULT_COLOR_MODE_CONFIG,
    docs: DEFAULT_DOCS_CONFIG,
    blog: DEFAULT_BLOG_CONFIG,
    metadata: [],
    prism: {
        additionalLanguages: [],
        theme: defaultPrismTheme,
        magicComments: [
            {
                className: 'theme-code-block-highlighted-line',
                line: 'highlight-next-line',
                block: { start: 'highlight-start', end: 'highlight-end' },
            },
        ],
    },
    navbar: {
        hideOnScroll: false,
        items: [],
    },
    tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 3,
    },
};
const NavbarItemPosition = utils_validation_1.Joi.string().equal('left', 'right').default('left');
const NavbarItemBaseSchema = utils_validation_1.Joi.object({
    label: utils_validation_1.Joi.string(),
    html: utils_validation_1.Joi.string(),
    className: utils_validation_1.Joi.string(),
})
    .nand('html', 'label')
    // We allow any unknown attributes on the links (users may need additional
    // attributes like target, aria-role, data-customAttribute...)
    .unknown();
const DefaultNavbarItemSchema = NavbarItemBaseSchema.append({
    to: utils_validation_1.Joi.string(),
    href: utils_validation_1.URISchema,
    activeBasePath: utils_validation_1.Joi.string(),
    activeBaseRegex: utils_validation_1.Joi.string(),
    prependBaseUrlToHref: utils_validation_1.Joi.bool(),
    // This is only triggered in case of a nested dropdown
    items: utils_validation_1.Joi.forbidden().messages({
        'any.unknown': 'Nested dropdowns are not allowed',
    }),
})
    .xor('href', 'to')
    .messages({
    'object.xor': 'One and only one between "to" and "href" should be provided',
});
const DocsVersionNavbarItemSchema = NavbarItemBaseSchema.append({
    type: utils_validation_1.Joi.string().equal('docsVersion').required(),
    to: utils_validation_1.Joi.string(),
    docsPluginId: utils_validation_1.Joi.string(),
});
const DocItemSchema = NavbarItemBaseSchema.append({
    type: utils_validation_1.Joi.string().equal('doc').required(),
    docId: utils_validation_1.Joi.string().required(),
    docsPluginId: utils_validation_1.Joi.string(),
});
const DocSidebarItemSchema = NavbarItemBaseSchema.append({
    type: utils_validation_1.Joi.string().equal('docSidebar').required(),
    sidebarId: utils_validation_1.Joi.string().required(),
    docsPluginId: utils_validation_1.Joi.string(),
});
const HtmlNavbarItemSchema = utils_validation_1.Joi.object({
    className: utils_validation_1.Joi.string(),
    type: utils_validation_1.Joi.string().equal('html').required(),
    value: utils_validation_1.Joi.string().required(),
});
// A temporary workaround to allow users to add custom navbar items
// See https://github.com/facebook/docusaurus/issues/7227
const CustomNavbarItemRegexp = /custom-.*/;
const CustomNavbarItemSchema = utils_validation_1.Joi.object({
    type: utils_validation_1.Joi.string().regex(CustomNavbarItemRegexp).required(),
}).unknown();
const itemWithType = (type) => {
    // Because equal(undefined) is not supported :/
    const typeSchema = 
    // eslint-disable-next-line no-nested-ternary
    type instanceof RegExp
        ? utils_validation_1.Joi.string().required().regex(type)
        : type
            ? utils_validation_1.Joi.string().required().equal(type)
            : utils_validation_1.Joi.string().forbidden();
    return utils_validation_1.Joi.object({
        type: typeSchema,
    })
        .unknown()
        .required();
};
const DropdownSubitemSchema = utils_validation_1.Joi.object({
    position: utils_validation_1.Joi.forbidden(),
}).when('.', {
    switch: [
        {
            is: itemWithType('docsVersion'),
            then: DocsVersionNavbarItemSchema,
        },
        {
            is: itemWithType('doc'),
            then: DocItemSchema,
        },
        {
            is: itemWithType('docSidebar'),
            then: DocSidebarItemSchema,
        },
        {
            is: itemWithType(undefined),
            then: DefaultNavbarItemSchema,
        },
        {
            is: itemWithType('html'),
            then: HtmlNavbarItemSchema,
        },
        {
            is: itemWithType(CustomNavbarItemRegexp),
            then: CustomNavbarItemSchema,
        },
        {
            is: utils_validation_1.Joi.alternatives().try(itemWithType('dropdown'), itemWithType('docsVersionDropdown'), itemWithType('localeDropdown'), itemWithType('search')),
            then: utils_validation_1.Joi.forbidden().messages({
                'any.unknown': 'Nested dropdowns are not allowed',
            }),
        },
    ],
    otherwise: utils_validation_1.Joi.forbidden().messages({
        'any.unknown': 'Bad navbar item type {.type}',
    }),
});
const DropdownNavbarItemSchema = NavbarItemBaseSchema.append({
    items: utils_validation_1.Joi.array().items(DropdownSubitemSchema).required(),
});
const DocsVersionDropdownNavbarItemSchema = NavbarItemBaseSchema.append({
    type: utils_validation_1.Joi.string().equal('docsVersionDropdown').required(),
    docsPluginId: utils_validation_1.Joi.string(),
    dropdownActiveClassDisabled: utils_validation_1.Joi.boolean(),
    dropdownItemsBefore: utils_validation_1.Joi.array().items(DropdownSubitemSchema).default([]),
    dropdownItemsAfter: utils_validation_1.Joi.array().items(DropdownSubitemSchema).default([]),
    versions: utils_validation_1.Joi.alternatives().try(utils_validation_1.Joi.array().items(utils_validation_1.Joi.string().min(1)).min(1), utils_validation_1.Joi.object()
        .pattern(utils_validation_1.Joi.string().min(1), utils_validation_1.Joi.object({
        label: utils_validation_1.Joi.string().min(1),
    }))
        .min(1)),
});
const LocaleDropdownNavbarItemSchema = NavbarItemBaseSchema.append({
    type: utils_validation_1.Joi.string().equal('localeDropdown').required(),
    dropdownItemsBefore: utils_validation_1.Joi.array().items(DropdownSubitemSchema).default([]),
    dropdownItemsAfter: utils_validation_1.Joi.array().items(DropdownSubitemSchema).default([]),
    queryString: utils_validation_1.Joi.string(),
});
const SearchItemSchema = utils_validation_1.Joi.object({
    type: utils_validation_1.Joi.string().equal('search').required(),
    className: utils_validation_1.Joi.string(),
});
const NavbarItemSchema = utils_validation_1.Joi.object({
    position: NavbarItemPosition,
}).when('.', {
    switch: [
        {
            is: itemWithType('docsVersion'),
            then: DocsVersionNavbarItemSchema,
        },
        {
            is: itemWithType('dropdown'),
            then: DropdownNavbarItemSchema,
        },
        {
            is: itemWithType('docsVersionDropdown'),
            then: DocsVersionDropdownNavbarItemSchema,
        },
        {
            is: itemWithType('doc'),
            then: DocItemSchema,
        },
        {
            is: itemWithType('docSidebar'),
            then: DocSidebarItemSchema,
        },
        {
            is: itemWithType('localeDropdown'),
            then: LocaleDropdownNavbarItemSchema,
        },
        {
            is: itemWithType('search'),
            then: SearchItemSchema,
        },
        {
            is: itemWithType('html'),
            then: HtmlNavbarItemSchema,
        },
        {
            is: itemWithType(CustomNavbarItemRegexp),
            then: CustomNavbarItemSchema,
        },
        {
            is: itemWithType(undefined),
            then: utils_validation_1.Joi.object().when('.', {
                // Dropdown item can be specified without type field
                is: utils_validation_1.Joi.object({
                    items: utils_validation_1.Joi.array().required(),
                }).unknown(),
                then: DropdownNavbarItemSchema,
                otherwise: DefaultNavbarItemSchema,
            }),
        },
    ],
    otherwise: utils_validation_1.Joi.forbidden().messages({
        'any.unknown': 'Bad navbar item type {.type}',
    }),
});
const ColorModeSchema = utils_validation_1.Joi.object({
    defaultMode: utils_validation_1.Joi.string()
        .equal('dark', 'light')
        .default(DEFAULT_COLOR_MODE_CONFIG.defaultMode),
    disableSwitch: utils_validation_1.Joi.bool().default(DEFAULT_COLOR_MODE_CONFIG.disableSwitch),
    respectPrefersColorScheme: utils_validation_1.Joi.bool().default(DEFAULT_COLOR_MODE_CONFIG.respectPrefersColorScheme),
    switchConfig: utils_validation_1.Joi.any().forbidden().messages({
        'any.unknown': 'colorMode.switchConfig is deprecated. If you want to customize the icons for light and dark mode, swizzle IconLightMode, IconDarkMode, or ColorModeToggle instead.',
    }),
}).default(DEFAULT_COLOR_MODE_CONFIG);
const HtmlMetadataSchema = utils_validation_1.Joi.object({
    id: utils_validation_1.Joi.string(),
    name: utils_validation_1.Joi.string(),
    property: utils_validation_1.Joi.string(),
    content: utils_validation_1.Joi.string(),
    itemprop: utils_validation_1.Joi.string(),
}).unknown();
const FooterLinkItemSchema = utils_validation_1.Joi.object({
    to: utils_validation_1.Joi.string(),
    href: utils_validation_1.URISchema,
    html: utils_validation_1.Joi.string(),
    label: utils_validation_1.Joi.string(),
    className: utils_validation_1.Joi.string(),
})
    .xor('to', 'href', 'html')
    .with('to', 'label')
    .with('href', 'label')
    .nand('html', 'label')
    // We allow any unknown attributes on the links (users may need additional
    // attributes like target, aria-role, data-customAttribute...)
    .unknown();
const FooterColumnItemSchema = utils_validation_1.Joi.object({
    title: utils_validation_1.Joi.string().allow(null).default(null),
    className: utils_validation_1.Joi.string(),
    items: utils_validation_1.Joi.array().items(FooterLinkItemSchema).default([]),
});
const LogoSchema = utils_validation_1.Joi.object({
    alt: utils_validation_1.Joi.string().allow(''),
    src: utils_validation_1.Joi.string().required(),
    srcDark: utils_validation_1.Joi.string(),
    width: utils_validation_1.Joi.alternatives().try(utils_validation_1.Joi.string(), utils_validation_1.Joi.number()),
    height: utils_validation_1.Joi.alternatives().try(utils_validation_1.Joi.string(), utils_validation_1.Joi.number()),
    href: utils_validation_1.Joi.string(),
    target: utils_validation_1.Joi.string(),
    style: utils_validation_1.Joi.object(),
    className: utils_validation_1.Joi.string(),
});
// Normalize prism language to lowercase
// See https://github.com/facebook/docusaurus/issues/9012
const PrismLanguage = utils_validation_1.Joi.string().custom((val) => val.toLowerCase());
exports.ThemeConfigSchema = utils_validation_1.Joi.object({
    // TODO temporary (@alpha-58)
    // @ts-expect-error: forbidden
    disableDarkMode: utils_validation_1.Joi.any().forbidden().messages({
        'any.unknown': 'disableDarkMode theme config is deprecated. Please use the new colorMode attribute. You likely want: config.themeConfig.colorMode.disableSwitch = true',
    }),
    // TODO temporary (@alpha-58)
    defaultDarkMode: utils_validation_1.Joi.any().forbidden().messages({
        'any.unknown': 'defaultDarkMode theme config is deprecated. Please use the new colorMode attribute. You likely want: config.themeConfig.colorMode.defaultMode = "dark"',
    }),
    colorMode: ColorModeSchema,
    image: utils_validation_1.Joi.string(),
    docs: DocsSchema,
    blog: BlogSchema,
    metadata: utils_validation_1.Joi.array()
        .items(HtmlMetadataSchema)
        .default(exports.DEFAULT_CONFIG.metadata),
    // cSpell:ignore metadatas
    metadatas: utils_validation_1.Joi.any().forbidden().messages({
        'any.unknown': 
        // cSpell:ignore metadatas
        'themeConfig.metadatas has been renamed as themeConfig.metadata. See https://github.com/facebook/docusaurus/pull/5871',
    }),
    announcementBar: utils_validation_1.Joi.object({
        id: utils_validation_1.Joi.string().default('announcement-bar'),
        content: utils_validation_1.Joi.string().required(),
        backgroundColor: utils_validation_1.Joi.string(),
        textColor: utils_validation_1.Joi.string(),
        isCloseable: utils_validation_1.Joi.bool().default(true),
    }).optional(),
    navbar: utils_validation_1.Joi.object({
        style: utils_validation_1.Joi.string().equal('dark', 'primary'),
        hideOnScroll: utils_validation_1.Joi.bool().default(exports.DEFAULT_CONFIG.navbar.hideOnScroll),
        // TODO temporary (@alpha-58)
        links: utils_validation_1.Joi.any().forbidden().messages({
            'any.unknown': 'themeConfig.navbar.links has been renamed as themeConfig.navbar.items',
        }),
        items: utils_validation_1.Joi.array()
            .items(NavbarItemSchema)
            .default(exports.DEFAULT_CONFIG.navbar.items),
        title: utils_validation_1.Joi.string().allow('', null),
        logo: LogoSchema,
    }).default(exports.DEFAULT_CONFIG.navbar),
    footer: utils_validation_1.Joi.object({
        style: utils_validation_1.Joi.string().equal('dark', 'light').default('light'),
        logo: LogoSchema,
        copyright: utils_validation_1.Joi.string(),
        links: utils_validation_1.Joi.alternatives(utils_validation_1.Joi.array().items(FooterColumnItemSchema), utils_validation_1.Joi.array().items(FooterLinkItemSchema))
            .messages({
            'alternatives.match': `The footer must be either simple or multi-column, and not a mix of the two. See: https://docusaurus.io/docs/api/themes/configuration#footer-links`,
        })
            .default([]),
    }).optional(),
    prism: utils_validation_1.Joi.object({
        theme: utils_validation_1.Joi.object({
            plain: utils_validation_1.Joi.alternatives().try(utils_validation_1.Joi.array(), utils_validation_1.Joi.object()).required(),
            styles: utils_validation_1.Joi.alternatives().try(utils_validation_1.Joi.array(), utils_validation_1.Joi.object()).required(),
        }).default(exports.DEFAULT_CONFIG.prism.theme),
        darkTheme: utils_validation_1.Joi.object({
            plain: utils_validation_1.Joi.alternatives().try(utils_validation_1.Joi.array(), utils_validation_1.Joi.object()).required(),
            styles: utils_validation_1.Joi.alternatives().try(utils_validation_1.Joi.array(), utils_validation_1.Joi.object()).required(),
        }),
        defaultLanguage: PrismLanguage,
        additionalLanguages: utils_validation_1.Joi.array()
            .items(PrismLanguage)
            .default(exports.DEFAULT_CONFIG.prism.additionalLanguages),
        magicComments: utils_validation_1.Joi.array()
            .items(utils_validation_1.Joi.object({
            className: utils_validation_1.Joi.string().required(),
            line: utils_validation_1.Joi.string(),
            block: utils_validation_1.Joi.object({
                start: utils_validation_1.Joi.string().required(),
                end: utils_validation_1.Joi.string().required(),
            }),
        }).or('line', 'block'))
            .default(exports.DEFAULT_CONFIG.prism.magicComments),
    })
        .default(exports.DEFAULT_CONFIG.prism)
        .unknown(),
    hideableSidebar: utils_validation_1.Joi.forbidden().messages({
        'any.unknown': 'themeConfig.hideableSidebar has been moved to themeConfig.docs.sidebar.hideable.',
    }),
    autoCollapseSidebarCategories: utils_validation_1.Joi.forbidden().messages({
        'any.unknown': 'themeConfig.autoCollapseSidebarCategories has been moved to themeConfig.docs.sidebar.autoCollapseCategories.',
    }),
    sidebarCollapsible: utils_validation_1.Joi.forbidden().messages({
        'any.unknown': 'The themeConfig.sidebarCollapsible has been moved to docs plugin options. See: https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-content-docs',
    }),
    tableOfContents: utils_validation_1.Joi.object({
        minHeadingLevel: utils_validation_1.Joi.number()
            .default(exports.DEFAULT_CONFIG.tableOfContents.minHeadingLevel)
            .when('maxHeadingLevel', {
            is: utils_validation_1.Joi.exist(),
            then: utils_validation_1.Joi.number()
                .integer()
                .min(2)
                .max(6)
                .max(utils_validation_1.Joi.ref('maxHeadingLevel')),
            otherwise: utils_validation_1.Joi.number().integer().min(2).max(6),
        }),
        maxHeadingLevel: utils_validation_1.Joi.number()
            .integer()
            .min(2)
            .max(6)
            .default(exports.DEFAULT_CONFIG.tableOfContents.maxHeadingLevel),
    }).default(exports.DEFAULT_CONFIG.tableOfContents),
});
function validateThemeConfig({ validate, themeConfig, }) {
    return validate(exports.ThemeConfigSchema, themeConfig);
}
const DEFAULT_OPTIONS = {
    customCss: [],
};
const PluginOptionSchema = utils_validation_1.Joi.object({
    customCss: utils_validation_1.Joi.alternatives()
        .try(utils_validation_1.Joi.array().items(utils_validation_1.Joi.string().required()), utils_validation_1.Joi.alternatives().conditional(utils_validation_1.Joi.string().required(), {
        then: utils_validation_1.Joi.custom((val) => [val]),
        otherwise: utils_validation_1.Joi.forbidden().messages({
            'any.unknown': '"customCss" must be a string or an array of strings',
        }),
    }))
        .default(DEFAULT_OPTIONS.customCss),
});
function validateOptions({ validate, options, }) {
    const validatedOptions = validate(PluginOptionSchema, options);
    return validatedOptions;
}
