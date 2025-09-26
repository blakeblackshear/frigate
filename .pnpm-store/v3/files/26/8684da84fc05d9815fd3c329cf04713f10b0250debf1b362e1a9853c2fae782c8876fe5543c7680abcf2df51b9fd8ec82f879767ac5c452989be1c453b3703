import { Readable } from 'stream';
import { SitemapItemLoose } from './types';
/**
 *
 * @param {object} options -
 * @param {string} options.hostname - The hostname for all URLs
 * @param {string} [options.sitemapHostname] - The hostname for the sitemaps if different than hostname
 * @param {SitemapItemLoose[] | string | Readable | string[]} options.sourceData - The urls you want to make a sitemap out of.
 * @param {string} options.destinationDir - where to write the sitemaps and index
 * @param {string} [options.publicBasePath] - where the sitemaps are relative to the hostname. Defaults to root.
 * @param {number} [options.limit] - how many URLs to write before switching to a new file. Defaults to 50k
 * @param {boolean} [options.gzip] - whether to compress the written files. Defaults to true
 * @returns {Promise<void>} an empty promise that resolves when everything is done
 */
export declare const simpleSitemapAndIndex: ({ hostname, sitemapHostname, sourceData, destinationDir, limit, gzip, publicBasePath, }: {
    hostname: string;
    sitemapHostname?: string | undefined;
    sourceData: SitemapItemLoose[] | string | Readable | string[];
    destinationDir: string;
    publicBasePath?: string | undefined;
    limit?: number | undefined;
    gzip?: boolean | undefined;
}) => Promise<void>;
export default simpleSitemapAndIndex;
