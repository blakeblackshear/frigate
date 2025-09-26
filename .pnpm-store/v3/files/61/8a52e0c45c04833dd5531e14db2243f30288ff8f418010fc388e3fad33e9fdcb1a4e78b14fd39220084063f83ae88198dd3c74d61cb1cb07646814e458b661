/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { OptionValidationContext } from '@docusaurus/types';
import type { ChangeFreq, LastModOption, SitemapItem, CreateSitemapItemsFn, CreateSitemapItemsParams } from './types';
export type PluginOptions = {
    /**
     * The path to the created sitemap file, relative to the output directory.
     * Useful if you have two plugin instances outputting two files.
     */
    filename: string;
    /**
     * A list of glob patterns; matching route paths will be filtered from the
     * sitemap. Note that you may need to include the base URL in here.
     */
    ignorePatterns: string[];
    /**
     * Defines the format of the "lastmod" sitemap item entry, between:
     * - null: do not compute/add a "lastmod" sitemap entry
     * - "date": add a "lastmod" sitemap entry without time (YYYY-MM-DD)
     * - "datetime": add a "lastmod" sitemap entry with time (ISO 8601 datetime)
     * @see https://www.sitemaps.org/protocol.html#xmlTagDefinitions
     * @see https://www.w3.org/TR/NOTE-datetime
     */
    lastmod: LastModOption | null;
    /**
     * TODO Docusaurus v4 breaking change: remove useless option
     * @see https://www.sitemaps.org/protocol.html#xmlTagDefinitions
     */
    changefreq: ChangeFreq | null;
    /**
     * TODO Docusaurus v4 breaking change: remove useless option
     * @see https://www.sitemaps.org/protocol.html#xmlTagDefinitions
     */
    priority: number | null;
    /** Allow control over the construction of SitemapItems */
    createSitemapItems?: CreateSitemapItemsOption;
};
type CreateSitemapItemsOption = (params: CreateSitemapItemsParams & {
    defaultCreateSitemapItems: CreateSitemapItemsFn;
}) => Promise<SitemapItem[]>;
export type Options = Partial<PluginOptions>;
export declare const DEFAULT_OPTIONS: PluginOptions;
export declare function validateOptions({ validate, options, }: OptionValidationContext<Options, PluginOptions>): PluginOptions;
export {};
