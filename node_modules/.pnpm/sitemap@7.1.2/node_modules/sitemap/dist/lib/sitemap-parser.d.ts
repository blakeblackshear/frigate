/// <reference types="node" />
import { SAXStream } from 'sax';
import { Readable, Transform, TransformOptions, TransformCallback } from 'stream';
import { SitemapItem, ErrorLevel } from './types';
declare type Logger = (level: 'warn' | 'error' | 'info' | 'log', ...message: Parameters<Console['log']>[0]) => void;
export interface XMLToSitemapItemStreamOptions extends TransformOptions {
    level?: ErrorLevel;
    logger?: Logger | false;
}
/**
 * Takes a stream of xml and transforms it into a stream of SitemapItems
 * Use this to parse existing sitemaps into config options compatible with this library
 */
export declare class XMLToSitemapItemStream extends Transform {
    level: ErrorLevel;
    logger: Logger;
    error: Error | null;
    saxStream: SAXStream;
    constructor(opts?: XMLToSitemapItemStreamOptions);
    _transform(data: string, encoding: string, callback: TransformCallback): void;
    private err;
}
/**
  Read xml and resolve with the configuration that would produce it or reject with
  an error
  ```
  const { createReadStream } = require('fs')
  const { parseSitemap, createSitemap } = require('sitemap')
  parseSitemap(createReadStream('./example.xml')).then(
    // produces the same xml
    // you can, of course, more practically modify it or store it
    (xmlConfig) => console.log(createSitemap(xmlConfig).toString()),
    (err) => console.log(err)
  )
  ```
  @param {Readable} xml what to parse
  @return {Promise<SitemapItem[]>} resolves with list of sitemap items that can be fed into a SitemapStream. Rejects with an Error object.
 */
export declare function parseSitemap(xml: Readable): Promise<SitemapItem[]>;
export interface ObjectStreamToJSONOptions extends TransformOptions {
    lineSeparated: boolean;
}
/**
 * A Transform that converts a stream of objects into a JSON Array or a line
 * separated stringified JSON
 * @param [lineSeparated=false] whether to separate entries by a new line or comma
 */
export declare class ObjectStreamToJSON extends Transform {
    lineSeparated: boolean;
    firstWritten: boolean;
    constructor(opts?: ObjectStreamToJSONOptions);
    _transform(chunk: SitemapItem, encoding: string, cb: TransformCallback): void;
    _flush(cb: TransformCallback): void;
}
export {};
