/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { useBaseUrlUtils } from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useBlogMetadata } from '@docusaurus/plugin-content-blog/client';
import { useBlogPost } from './contexts';
const convertDate = (dateMs) => new Date(dateMs).toISOString();
function getBlogPost(blogPostContent, siteConfig, withBaseUrl) {
    const { assets, frontMatter, metadata } = blogPostContent;
    const { date, title, description, lastUpdatedAt } = metadata;
    const image = assets.image ?? frontMatter.image;
    const keywords = frontMatter.keywords ?? [];
    const blogUrl = `${siteConfig.url}${metadata.permalink}`;
    const dateModified = lastUpdatedAt ? convertDate(lastUpdatedAt) : undefined;
    return {
        '@type': 'BlogPosting',
        '@id': blogUrl,
        mainEntityOfPage: blogUrl,
        url: blogUrl,
        headline: title,
        name: title,
        description,
        datePublished: date,
        ...(dateModified ? { dateModified } : {}),
        ...getAuthor(metadata.authors),
        ...getImage(image, withBaseUrl, title),
        ...(keywords ? { keywords } : {}),
    };
}
function getAuthor(authors) {
    const authorsStructuredData = authors.map(createPersonStructuredData);
    return {
        author: authorsStructuredData.length === 1
            ? authorsStructuredData[0]
            : authorsStructuredData,
    };
}
function getImage(image, withBaseUrl, title) {
    return image
        ? {
            image: createImageStructuredData({
                imageUrl: withBaseUrl(image, { absolute: true }),
                caption: `title image for the blog post: ${title}`,
            }),
        }
        : {};
}
export function useBlogListPageStructuredData(props) {
    const { siteConfig } = useDocusaurusContext();
    const { withBaseUrl } = useBaseUrlUtils();
    const { metadata: { blogDescription, blogTitle, permalink }, } = props;
    const url = `${siteConfig.url}${permalink}`;
    // details on structured data support: https://schema.org/Blog
    return {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        '@id': url,
        mainEntityOfPage: url,
        headline: blogTitle,
        description: blogDescription,
        blogPost: props.items.map((blogItem) => getBlogPost(blogItem.content, siteConfig, withBaseUrl)),
    };
}
export function useBlogPostStructuredData() {
    const blogMetadata = useBlogMetadata();
    const { assets, metadata } = useBlogPost();
    const { siteConfig } = useDocusaurusContext();
    const { withBaseUrl } = useBaseUrlUtils();
    const { date, title, description, frontMatter, lastUpdatedAt } = metadata;
    const image = assets.image ?? frontMatter.image;
    const keywords = frontMatter.keywords ?? [];
    const dateModified = lastUpdatedAt ? convertDate(lastUpdatedAt) : undefined;
    const url = `${siteConfig.url}${metadata.permalink}`;
    // details on structured data support: https://schema.org/BlogPosting
    // BlogPosting is one of the structured data types that Google explicitly
    // supports: https://developers.google.com/search/docs/appearance/structured-data/article#structured-data-type-definitions
    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        '@id': url,
        mainEntityOfPage: url,
        url,
        headline: title,
        name: title,
        description,
        datePublished: date,
        ...(dateModified ? { dateModified } : {}),
        ...getAuthor(metadata.authors),
        ...getImage(image, withBaseUrl, title),
        ...(keywords ? { keywords } : {}),
        isPartOf: {
            '@type': 'Blog',
            '@id': `${siteConfig.url}${blogMetadata.blogBasePath}`,
            name: blogMetadata.blogTitle,
        },
    };
}
/** @returns A {@link https://schema.org/Person} constructed from the {@link Author} */
function createPersonStructuredData(author) {
    return {
        '@type': 'Person',
        ...(author.name ? { name: author.name } : {}),
        ...(author.title ? { description: author.title } : {}),
        ...(author.url ? { url: author.url } : {}),
        ...(author.email ? { email: author.email } : {}),
        ...(author.imageURL ? { image: author.imageURL } : {}),
    };
}
/** @returns A {@link https://schema.org/ImageObject} */
function createImageStructuredData({ imageUrl, caption, }) {
    return {
        '@type': 'ImageObject',
        '@id': imageUrl,
        url: imageUrl,
        contentUrl: imageUrl,
        caption,
    };
}
