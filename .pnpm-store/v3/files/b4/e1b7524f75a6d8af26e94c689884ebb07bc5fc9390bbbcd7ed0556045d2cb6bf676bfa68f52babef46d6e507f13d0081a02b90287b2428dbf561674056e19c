/// <reference types="node" />
import { Transform, TransformOptions, TransformCallback } from 'stream';
import { SitemapItem, ErrorLevel } from './types';
export interface StringObj {
    [index: string]: any;
}
export interface SitemapItemStreamOptions extends TransformOptions {
    level?: ErrorLevel;
}
/**
 * Takes a stream of SitemapItemOptions and spits out xml for each
 * @example
 * // writes <url><loc>https://example.com</loc><url><url><loc>https://example.com/2</loc><url>
 * const smis = new SitemapItemStream({level: 'warn'})
 * smis.pipe(writestream)
 * smis.write({url: 'https://example.com', img: [], video: [], links: []})
 * smis.write({url: 'https://example.com/2', img: [], video: [], links: []})
 * smis.end()
 * @param level - Error level
 */
export declare class SitemapItemStream extends Transform {
    level: ErrorLevel;
    constructor(opts?: SitemapItemStreamOptions);
    _transform(item: SitemapItem, encoding: string, callback: TransformCallback): void;
}
