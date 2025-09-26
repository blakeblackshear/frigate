# sitemap ![MIT License](https://img.shields.io/npm/l/sitemap)[![Build Status](https://travis-ci.org/ekalinin/sitemap.js.svg?branch=master)](https://travis-ci.org/ekalinin/sitemap.js)![Monthly Downloads](https://img.shields.io/npm/dm/sitemap)

**sitemap** is a high-level streaming sitemap-generating library/CLI that
makes creating [sitemap XML](http://www.sitemaps.org/) files easy. [What is a sitemap?](https://support.google.com/webmasters/answer/156184?hl=en&ref_topic=4581190)

## Table of Contents

- [Installation](#installation)
- [Generate a one time sitemap from a list of urls](#generate-a-one-time-sitemap-from-a-list-of-urls)
- [Example of using sitemap.js with](#serve-a-sitemap-from-a-server-and-periodically-update-it) [express](https://expressjs.com/)
- [Generating more than one sitemap](#create-sitemap-and-index-files-from-one-large-list)
- [Options you can pass](#options-you-can-pass)
- [Examples](#examples)
- [API](#api)
- [Maintainers](#maintainers)
- [License](#license)

## Installation

```sh
npm install --save sitemap
```

## Generate a one time sitemap from a list of urls

If you are just looking to take a giant list of URLs and turn it into some sitemaps, try out our CLI. The cli can also parse, update and validate existing sitemaps.

```sh
npx sitemap < listofurls.txt # `npx sitemap -h` for more examples and a list of options.
```

For programmatic one time generation of a sitemap try:

```js
  const { SitemapStream, streamToPromise } = require( 'sitemap' )
  const { Readable } = require( 'stream' )

  // An array with your links
  const links = [{ url: '/page-1/',  changefreq: 'daily', priority: 0.3  }]

  // Create a stream to write to
  const stream = new SitemapStream( { hostname: 'https://...' } )

  // Return a promise that resolves with your XML string
  return streamToPromise(Readable.from(links).pipe(stream)).then((data) =>
    data.toString()
  )
```

## Serve a sitemap from a server and periodically update it

Use this if you have less than 50 thousand urls. See SitemapAndIndexStream for if you have more.

```js
const express = require('express')
const { SitemapStream, streamToPromise } = require('sitemap')
const { createGzip } = require('zlib')
const { Readable } = require('stream')

const app = express()
let sitemap

app.get('/sitemap.xml', function(req, res) {
  res.header('Content-Type', 'application/xml');
  res.header('Content-Encoding', 'gzip');
  // if we have a cached entry send it
  if (sitemap) {
    res.send(sitemap)
    return
  }

  try {
    const smStream = new SitemapStream({ hostname: 'https://example.com/' })
    const pipeline = smStream.pipe(createGzip())

    // pipe your entries or directly write them.
    smStream.write({ url: '/page-1/',  changefreq: 'daily', priority: 0.3 })
    smStream.write({ url: '/page-2/',  changefreq: 'monthly',  priority: 0.7 })
    smStream.write({ url: '/page-3/'})    // changefreq: 'weekly',  priority: 0.5
    smStream.write({ url: '/page-4/',   img: "http://urlTest.com" })
    /* or use
    Readable.from([{url: '/page-1'}...]).pipe(smStream)
    if you are looking to avoid writing your own loop.
    */

    // cache the response
    streamToPromise(pipeline).then(sm => sitemap = sm)
    // make sure to attach a write stream such as streamToPromise before ending
    smStream.end()
    // stream write the response
    pipeline.pipe(res).on('error', (e) => {throw e})
  } catch (e) {
    console.error(e)
    res.status(500).end()
  }
})

app.listen(3000, () => {
  console.log('listening')
});
```

## Create sitemap and index files from one large list

If you know you are definitely going to have more than 50,000 urls in your sitemap, you can use this slightly more complex interface to create a new sitemap every 45,000 entries and add that file to a sitemap index.

```js
const { createReadStream, createWriteStream } = require('fs');
const { resolve } = require('path');
const { createGzip } = require('zlib')
const {
  simpleSitemapAndIndex,
  lineSeparatedURLsToSitemapOptions
} = require('sitemap')

// writes sitemaps and index out to the destination you provide.
simpleSitemapAndIndex({
  hostname: 'https://example.com',
  destinationDir: './',
  sourceData: lineSeparatedURLsToSitemapOptions(
    createReadStream('./your-data.json.txt')
  ),
  // or (only works with node 10.17 and up)
  sourceData: [{ url: '/page-1/', changefreq: 'daily'}, ...],
  // or
  sourceData: './your-data.json.txt',
}).then(() => {
  // Do follow up actions
})
```

Want to customize that?

```js
const { createReadStream, createWriteStream } = require('fs');
const { resolve } = require('path');
const { createGzip } = require('zlib')
const { Readable } = require('stream')
const {
  SitemapAndIndexStream,
  SitemapStream,
  lineSeparatedURLsToSitemapOptions
} = require('sitemap')

const sms = new SitemapAndIndexStream({
  limit: 50000, // defaults to 45k
  lastmodDateOnly: false, // print date not time
  // SitemapAndIndexStream will call this user provided function every time
  // it needs to create a new sitemap file. You merely need to return a stream
  // for it to write the sitemap urls to and the expected url where that sitemap will be hosted
  getSitemapStream: (i) => {
    const sitemapStream = new SitemapStream({ hostname: 'https://example.com' });
    // if your server automatically serves sitemap.xml.gz when requesting sitemap.xml leave this line be
    // otherwise you will need to add .gz here and remove it a couple lines below so that both the index 
    // and the actual file have a .gz extension
    const path = `./sitemap-${i}.xml`; 

    const ws = sitemapStream
      .pipe(createGzip()) // compress the output of the sitemap
      .pipe(createWriteStream(resolve(path + '.gz'))); // write it to sitemap-NUMBER.xml

    return [new URL(path, 'https://example.com/subdir/').toString(), sitemapStream, ws];
  },
});

// when reading from a file
lineSeparatedURLsToSitemapOptions(
  createReadStream('./your-data.json.txt')
)
.pipe(sms)
.pipe(createGzip())
.pipe(createWriteStream(resolve('./sitemap-index.xml.gz')));

// or reading straight from an in-memory array
sms
.pipe(createGzip())
.pipe(createWriteStream(resolve('./sitemap-index.xml.gz')));

const arrayOfSitemapItems = [{ url: '/page-1/', changefreq: 'daily'}, ...]
Readable.from(arrayOfSitemapItems).pipe(sms) // available as of node 10.17.0
// or
arrayOfSitemapItems.forEach(item => sms.write(item))
sms.end() // necessary to let it know you've got nothing else to write
```

### Options you can pass

```js
const { SitemapStream, streamToPromise } = require('sitemap');
const smStream = new SitemapStream({
  hostname: 'http://www.mywebsite.com',
  xslUrl: "https://example.com/style.xsl",
  lastmodDateOnly: false, // print date not time
  xmlns: { // trim the xml namespace
    news: true, // flip to false to omit the xml namespace for news
    xhtml: true,
    image: true,
    video: true,
    custom: [
      'xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"',
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    ],
  }
 })
// coalesce stream to value
// alternatively you can pipe to another stream
streamToPromise(smStream).then(console.log)

smStream.write({
  url: '/page1',
  changefreq: 'weekly',
  priority: 0.8, // A hint to the crawler that it should prioritize this over items less than 0.8
})

// each sitemap entry supports many options
// See [Sitemap Item Options](./api.md#sitemap-item-options) below for details
smStream.write({
  url: 'http://test.com/page-1/',
  img: [
    {
      url: 'http://test.com/img1.jpg',
      caption: 'An image',
      title: 'The Title of Image One',
      geoLocation: 'London, United Kingdom',
      license: 'https://creativecommons.org/licenses/by/4.0/'
    },
    {
      url: 'http://test.com/img2.jpg',
      caption: 'Another image',
      title: 'The Title of Image Two',
      geoLocation: 'London, United Kingdom',
      license: 'https://creativecommons.org/licenses/by/4.0/'
    }
  ],
  video: [
    {
      thumbnail_loc: 'http://test.com/tmbn1.jpg',
      title: 'A video title',
      description: 'This is a video'
    },
    {
      thumbnail_loc: 'http://test.com/tmbn2.jpg',
      title: 'A video with an attribute',
      description: 'This is another video',
      'player_loc': 'http://www.example.com/videoplayer.mp4?video=123',
      'player_loc:autoplay': 'ap=1',
      'player_loc:allow_embed': 'yes'
    }
  ],
  links: [
    { lang: 'en', url: 'http://test.com/page-1/' },
    { lang: 'ja', url: 'http://test.com/page-1/ja/' }
  ],
  androidLink: 'android-app://com.company.test/page-1/',
  news: {
    publication: {
      name: 'The Example Times',
      language: 'en'
    },
    genres: 'PressRelease, Blog',
    publication_date: '2008-12-23',
    title: 'Companies A, B in Merger Talks',
    keywords: 'business, merger, acquisition, A, B',
    stock_tickers: 'NASDAQ:A, NASDAQ:B'
  }
})
// indicate there is nothing left to write
smStream.end()
```

## Examples

For more examples see the [examples directory](./examples/)

## API

Full API docs can be found [here](./api.md)

## Maintainers

- [@ekalinin](https://github.com/ekalinin)
- [@derduher](https://github.com/derduher)

## License

See [LICENSE](https://github.com/ekalinin/sitemap.js/blob/master/LICENSE) file.
