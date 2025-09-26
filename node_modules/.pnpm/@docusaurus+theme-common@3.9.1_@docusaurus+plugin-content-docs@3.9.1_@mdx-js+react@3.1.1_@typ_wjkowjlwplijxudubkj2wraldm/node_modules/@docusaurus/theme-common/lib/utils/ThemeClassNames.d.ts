/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * These class names are used to style page layouts in Docusaurus, meant to be
 * targeted by user-provided custom CSS selectors.
 */
export declare const ThemeClassNames: {
    readonly page: {
        readonly blogListPage: "blog-list-page";
        readonly blogPostPage: "blog-post-page";
        readonly blogTagsListPage: "blog-tags-list-page";
        readonly blogTagPostListPage: "blog-tags-post-list-page";
        readonly blogAuthorsListPage: "blog-authors-list-page";
        readonly blogAuthorsPostsPage: "blog-authors-posts-page";
        readonly docsDocPage: "docs-doc-page";
        readonly docsTagsListPage: "docs-tags-list-page";
        readonly docsTagDocListPage: "docs-tags-doc-list-page";
        readonly mdxPage: "mdx-page";
    };
    readonly wrapper: {
        readonly main: "main-wrapper";
        readonly blogPages: "blog-wrapper";
        readonly docsPages: "docs-wrapper";
        readonly mdxPages: "mdx-wrapper";
    };
    readonly common: {
        readonly editThisPage: "theme-edit-this-page";
        readonly lastUpdated: "theme-last-updated";
        readonly backToTopButton: "theme-back-to-top-button";
        readonly codeBlock: "theme-code-block";
        readonly admonition: "theme-admonition";
        readonly unlistedBanner: "theme-unlisted-banner";
        readonly draftBanner: "theme-draft-banner";
        readonly admonitionType: (type: string) => string;
    };
    readonly announcementBar: {
        readonly container: "theme-announcement-bar";
    };
    readonly tabs: {
        readonly container: "theme-tabs-container";
    };
    readonly layout: {
        readonly navbar: {
            readonly container: "theme-layout-navbar";
            readonly containerLeft: "theme-layout-navbar-left";
            readonly containerRight: "theme-layout-navbar-right";
            readonly mobileSidebar: {
                readonly container: "theme-layout-navbar-sidebar";
                readonly panel: "theme-layout-navbar-sidebar-panel";
            };
        };
        readonly main: {
            readonly container: "theme-layout-main";
        };
        readonly footer: {
            readonly container: "theme-layout-footer";
            readonly column: "theme-layout-footer-column";
        };
    };
    /**
     * Follows the naming convention "theme-{blog,doc,version,page}?-<suffix>"
     */
    readonly docs: {
        readonly docVersionBanner: "theme-doc-version-banner";
        readonly docVersionBadge: "theme-doc-version-badge";
        readonly docBreadcrumbs: "theme-doc-breadcrumbs";
        readonly docMarkdown: "theme-doc-markdown";
        readonly docTocMobile: "theme-doc-toc-mobile";
        readonly docTocDesktop: "theme-doc-toc-desktop";
        readonly docFooter: "theme-doc-footer";
        readonly docFooterTagsRow: "theme-doc-footer-tags-row";
        readonly docFooterEditMetaRow: "theme-doc-footer-edit-meta-row";
        readonly docSidebarContainer: "theme-doc-sidebar-container";
        readonly docSidebarMenu: "theme-doc-sidebar-menu";
        readonly docSidebarItemCategory: "theme-doc-sidebar-item-category";
        readonly docSidebarItemLink: "theme-doc-sidebar-item-link";
        readonly docSidebarItemCategoryLevel: (level: number) => `theme-doc-sidebar-item-category-level-${number}`;
        readonly docSidebarItemLinkLevel: (level: number) => `theme-doc-sidebar-item-link-level-${number}`;
    };
    readonly blog: {
        readonly blogFooterTagsRow: "theme-blog-footer-tags-row";
        readonly blogFooterEditMetaRow: "theme-blog-footer-edit-meta-row";
    };
    readonly pages: {
        readonly pageFooterEditMetaRow: "theme-pages-footer-edit-meta-row";
    };
};
//# sourceMappingURL=ThemeClassNames.d.ts.map