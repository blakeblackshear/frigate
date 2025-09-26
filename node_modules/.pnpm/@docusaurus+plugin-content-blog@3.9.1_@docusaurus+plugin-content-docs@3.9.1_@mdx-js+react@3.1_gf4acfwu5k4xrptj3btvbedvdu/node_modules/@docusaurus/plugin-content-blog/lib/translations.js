"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTranslationFiles = getTranslationFiles;
exports.translateContent = translateContent;
function translateListPage(blogListPaginated, translations) {
    return blogListPaginated.map((page) => {
        const { items, metadata } = page;
        return {
            items,
            metadata: {
                ...metadata,
                blogTitle: translations.title?.message ?? page.metadata.blogTitle,
                blogDescription: translations.description?.message ?? page.metadata.blogDescription,
            },
        };
    });
}
function getTranslationFiles(options) {
    return [
        {
            path: 'options',
            content: {
                title: {
                    message: options.blogTitle,
                    description: 'The title for the blog used in SEO',
                },
                description: {
                    message: options.blogDescription,
                    description: 'The description for the blog used in SEO',
                },
                'sidebar.title': {
                    message: options.blogSidebarTitle,
                    description: 'The label for the left sidebar',
                },
            },
        },
    ];
}
function translateContent(content, translationFiles) {
    const { content: optionsTranslations } = translationFiles[0];
    return {
        ...content,
        blogSidebarTitle: optionsTranslations['sidebar.title']?.message ?? content.blogSidebarTitle,
        blogListPaginated: translateListPage(content.blogListPaginated, optionsTranslations),
    };
}
