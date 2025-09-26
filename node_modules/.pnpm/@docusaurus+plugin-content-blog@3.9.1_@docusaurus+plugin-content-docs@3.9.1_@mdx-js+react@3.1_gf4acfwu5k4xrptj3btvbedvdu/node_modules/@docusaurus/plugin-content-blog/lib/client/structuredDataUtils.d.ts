/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { Props as BlogListPageStructuredDataProps } from '@theme/BlogListPage/StructuredData';
import type { Blog, BlogPosting, WithContext } from 'schema-dts';
export declare function useBlogListPageStructuredData(props: BlogListPageStructuredDataProps): WithContext<Blog>;
export declare function useBlogPostStructuredData(): WithContext<BlogPosting>;
