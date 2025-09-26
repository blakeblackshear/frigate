/// <reference types="node" />
import { Readable, ReadableOptions, TransformOptions } from 'stream';
import { SitemapItem, ErrorLevel, SitemapItemLoose, ErrorHandler } from './types';
/**
 * Verifies all data passed in will comply with sitemap spec.
 * @param conf Options to validate
 * @param level logging level
 * @param errorHandler error handling func
 */
export declare function validateSMIOptions(conf: SitemapItem, level?: ErrorLevel, errorHandler?: ErrorHandler): SitemapItem;
/**
 * Combines multiple streams into one
 * @param streams the streams to combine
 */
export declare function mergeStreams(streams: Readable[], options?: TransformOptions): Readable;
export interface ReadlineStreamOptions extends ReadableOptions {
    input: Readable;
}
/**
 * Wraps node's ReadLine in a stream
 */
export declare class ReadlineStream extends Readable {
    private _source;
    constructor(options: ReadlineStreamOptions);
    _read(size: number): void;
}
/**
 * Takes a stream likely from fs.createReadStream('./path') and returns a stream
 * of sitemap items
 * @param stream a stream of line separated urls.
 * @param opts.isJSON is the stream line separated JSON. leave undefined to guess
 */
export declare function lineSeparatedURLsToSitemapOptions(stream: Readable, { isJSON }?: {
    isJSON?: boolean;
}): Readable;
/**
 * Based on lodash's implementation of chunk.
 *
 * Copyright JS Foundation and other contributors <https://js.foundation/>
 *
 * Based on Underscore.js, copyright Jeremy Ashkenas,
 * DocumentCloud and Investigative Reporters & Editors <http://underscorejs.org/>
 *
 * This software consists of voluntary contributions made by many
 * individuals. For exact contribution history, see the revision history
 * available at https://github.com/lodash/lodash
 */
export declare function chunk(array: any[], size?: number): any[];
/**
 * Converts the passed in sitemap entry into one capable of being consumed by SitemapItem
 * @param {string | SitemapItemLoose} elem the string or object to be converted
 * @param {string} hostname
 * @returns SitemapItemOptions a strict sitemap item option
 */
export declare function normalizeURL(elem: string | SitemapItemLoose, hostname?: string, lastmodDateOnly?: boolean): SitemapItem;
