/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { PropSidebarBreadcrumbsItem } from '@docusaurus/plugin-content-docs';
import type { WithContext, BreadcrumbList } from 'schema-dts';
export declare function useBreadcrumbsStructuredData({ breadcrumbs, }: {
    breadcrumbs: PropSidebarBreadcrumbsItem[];
}): WithContext<BreadcrumbList>;
