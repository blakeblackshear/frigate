#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const xmllint_1 = require("./lib/xmllint");
const errors_1 = require("./lib/errors");
const sitemap_parser_1 = require("./lib/sitemap-parser");
const utils_1 = require("./lib/utils");
const sitemap_stream_1 = require("./lib/sitemap-stream");
const sitemap_index_stream_1 = require("./lib/sitemap-index-stream");
const url_1 = require("url");
const zlib_1 = require("zlib");
const types_1 = require("./lib/types");
/* eslint-disable-next-line @typescript-eslint/no-var-requires */
const arg = require('arg');
const pickStreamOrArg = (argv) => {
    if (!argv._.length) {
        return process.stdin;
    }
    else {
        return (0, fs_1.createReadStream)(argv._[0], { encoding: 'utf8' });
    }
};
const argSpec = {
    '--help': Boolean,
    '--version': Boolean,
    '--validate': Boolean,
    '--index': Boolean,
    '--index-base-url': String,
    '--limit': Number,
    '--parse': Boolean,
    '--single-line-json': Boolean,
    '--prepend': String,
    '--gzip': Boolean,
    '-h': '--help',
};
const argv = arg(argSpec);
function getStream() {
    if (argv._ && argv._.length) {
        return (0, fs_1.createReadStream)(argv._[0]);
    }
    else {
        console.warn('Reading from stdin. If you are not piping anything in, this command is not doing anything');
        return process.stdin;
    }
}
if (argv['--version']) {
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    const packagejson = require('../package.json');
    console.log(packagejson.version);
}
else if (argv['--help']) {
    console.log(`
Turn a list of urls into a sitemap xml.
Options:
  --help                 Print this text
  --version              Print the version
  --validate             Ensure the passed in file is conforms to the sitemap spec
  --index                Create an index and stream that out. Writes out sitemaps along the way.
  --index-base-url       Base url the sitemaps will be hosted eg. https://example.com/sitemaps/
  --limit=45000          Set a custom limit to the items per sitemap
  --parse                Parse fed xml and spit out config
  --prepend=sitemap.xml  Prepend the streamed in sitemap configs to sitemap.xml
  --gzip                 Compress output
  --single-line-json     When used with parse, it spits out each entry as json rather than the whole json.

# examples

Generate a sitemap index file as well as sitemaps
  npx sitemap --gzip --index --index-base-url https://example.com/path/to/sitemaps/ < listofurls.txt > sitemap-index.xml.gz

Add to a sitemap
  npx sitemap --prepend sitemap.xml < listofurls.json

Turn an existing sitemap into configuration understood by the sitemap library
  npx sitemap --parse sitemap.xml

Use XMLLib to validate your sitemap (requires xmllib)
  npx sitemap --validate sitemap.xml
`);
}
else if (argv['--parse']) {
    let oStream = getStream()
        .pipe(new sitemap_parser_1.XMLToSitemapItemStream({ level: types_1.ErrorLevel.THROW }))
        .pipe(new sitemap_parser_1.ObjectStreamToJSON({ lineSeparated: !argv['--single-line-json'] }));
    if (argv['--gzip']) {
        oStream = oStream.pipe((0, zlib_1.createGzip)());
    }
    oStream.pipe(process.stdout);
}
else if (argv['--validate']) {
    (0, xmllint_1.xmlLint)(getStream())
        .then(() => console.log('valid'))
        .catch(([error, stderr]) => {
        if (error instanceof errors_1.XMLLintUnavailable) {
            console.error(error.message);
            return;
        }
        else {
            console.log(stderr);
        }
    });
}
else if (argv['--index']) {
    const limit = argv['--limit'];
    const baseURL = argv['--index-base-url'];
    if (!baseURL) {
        throw new Error("You must specify where the sitemaps will be hosted. use --index-base-url 'https://example.com/path'");
    }
    const sms = new sitemap_index_stream_1.SitemapAndIndexStream({
        limit,
        getSitemapStream: (i) => {
            const sm = new sitemap_stream_1.SitemapStream();
            const path = `./sitemap-${i}.xml`;
            let ws;
            if (argv['--gzip']) {
                ws = sm.pipe((0, zlib_1.createGzip)()).pipe((0, fs_1.createWriteStream)(path));
            }
            else {
                ws = sm.pipe((0, fs_1.createWriteStream)(path));
            }
            return [new url_1.URL(path, baseURL).toString(), sm, ws];
        },
    });
    let oStream = (0, utils_1.lineSeparatedURLsToSitemapOptions)(pickStreamOrArg(argv)).pipe(sms);
    if (argv['--gzip']) {
        oStream = oStream.pipe((0, zlib_1.createGzip)());
    }
    oStream.pipe(process.stdout);
}
else {
    const sms = new sitemap_stream_1.SitemapStream();
    if (argv['--prepend']) {
        (0, fs_1.createReadStream)(argv['--prepend'])
            .pipe(new sitemap_parser_1.XMLToSitemapItemStream())
            .pipe(sms);
    }
    const oStream = (0, utils_1.lineSeparatedURLsToSitemapOptions)(pickStreamOrArg(argv)).pipe(sms);
    if (argv['--gzip']) {
        oStream.pipe((0, zlib_1.createGzip)()).pipe(process.stdout);
    }
    else {
        oStream.pipe(process.stdout);
    }
}
