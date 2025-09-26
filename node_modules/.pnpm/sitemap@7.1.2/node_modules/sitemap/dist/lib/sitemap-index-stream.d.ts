/// <reference types="node" />
import { Transform, TransformOptions, TransformCallback } from 'stream';
import { IndexItem, SitemapItemLoose, ErrorLevel } from './types';
import { SitemapStream } from './sitemap-stream';
import { WriteStream } from 'fs';
export declare enum IndexTagNames {
    sitemap = "sitemap",
    loc = "loc",
    lastmod = "lastmod"
}
export interface SitemapIndexStreamOptions extends TransformOptions {
    lastmodDateOnly?: boolean;
    level?: ErrorLevel;
    xslUrl?: string;
}
export declare class SitemapIndexStream extends Transform {
    lastmodDateOnly: boolean;
    level: ErrorLevel;
    xslUrl?: string;
    private hasHeadOutput;
    constructor(opts?: SitemapIndexStreamOptions);
    _transform(item: IndexItem | string, encoding: string, callback: TransformCallback): void;
    _flush(cb: TransformCallback): void;
}
declare type getSitemapStream = (i: number) => [IndexItem | string, SitemapStream, WriteStream];
export interface SitemapAndIndexStreamOptions extends SitemapIndexStreamOptions {
    level?: ErrorLevel;
    limit?: number;
    getSitemapStream: getSitemapStream;
}
export declare class SitemapAndIndexStream extends SitemapIndexStream {
    private i;
    private getSitemapStream;
    private currentSitemap;
    private currentSitemapPipeline?;
    private idxItem;
    private limit;
    constructor(opts: SitemapAndIndexStreamOptions);
    _writeSMI(item: SitemapItemLoose, callback: () => void): void;
    _transform(item: SitemapItemLoose, encoding: string, callback: TransformCallback): void;
    _flush(cb: TransformCallback): void;
}
export {};
