# Changelog

## 7.1.2

- fix #425 via #426 thanks to @huntharo update streamToPromise to bubble up errors + jsDoc
- fix #415 thanks to @mohd-akram Fix circular dependency breaking Node.js 20.6
- non-breaking updates of dependent packages

## 7.1.1

- fix #378 exit code not set on parse failure. A proper error will be set on the stream now.
- fix #384 thanks @tomcek112 parseSitemapIndex not included in 7.1.0 release
- fix #356 thanks @vandres - SitemapIndexStream now has lastmodDateOnly
- Fix #375 thanks @huntharo parseSitemap and parseSitemapIndex uncatchable errors 
- Filter out null as well when writing XML thanks @huntharo #376

## 7.1.0

- bumped types dependency for node
- bumped all dev dependencies - includes some prettier changes
- package-lock updated to version 2

## 7.0.0

### [BREAKING]

- dropped support for Node 10, added support for Node 16
- removed deprecated createSitemapsAndIndex. use SitemapAndIndexStream or simpleSitemapAndIndex
- dropped deprecated `getSitemapStream` option for SitemapAndIndexStream that does not return a write stream
- fixed invalid documentation for #357

### non-breaking

- Added option to simplesitemap `publicBasePath`: allows the user to set the location of sitemap files hosted on the site fixes [#359]
- bumped dependencies

## 6.4.0

- added support for content_loc parsing #347 and uploader info attr
- added error handler option to sitemapstream #349 Thanks @marcoreni

## 6.3.6

- bump dependencies

## 6.3.5

- Add option to silence or redirect logs from parse #337
  - `new XMLToSitemapItemStream({ logger: false })` or 
  - `new XMLToSitemapItemStream({ level: ErrorLevel.SILENT })` or 
  - `new XMLToSitemapItemStream({ logger: (level, ...message) => your.custom.logger(...message) })`

## 6.3.4

- bump dependencies
- correct return type of xmllint. Was `Promise<null>` but actually returned `Promise<void>`
- add alternate option for lang, hreflang as that is the actual name of the printed attribute

## 6.3.3

- bump ts to 4
- change file reference in sitemap-index to include .gz fixes #334

## 6.3.2

- fix unreported timing issue in SitemapAndIndexStream uncovered in latest unit tests

## 6.3.1

- fix #331 incorrect type on sourceData in simpleSitemapAndIndex.

## 6.3.0

- simpleSitemap will create the dest directory if it doesn't exist
- allow user to not gzip fixes #322

## 6.2.0

- Add simplified interface for creating sitemaps and index
- fix bug where sitemap and index stream would not properly wait to emit finish event until all sitemaps had been written
- bump deps

## 6.1.7

- Improve documentation and error messaging on ending a stream too early #317
- bump dependencies

## 6.1.6

- support allow_embed #314
- bump dependencies

## 6.1.5

- performance improvement for streamToPromise #307

## 6.1.4

- remove stale files from dist #298
- Correct documentation on renamed XMLToSitemapOptions, XMLToSitemapItemStream #297
- bump node typedef to 14.0.1

## 6.1.3

- bump node types resolves #293

## 6.1.2

- bump node types resolves #290

## 6.1.1

- Fix #286 sitemapindex tag not closing for deprecated createSitemapsAndIndex

## 6.1.0

- Added back xslUrl option removed in 5.0.0

## 6.0.0

- removed xmlbuilder as a dependency
- added stronger validity checking on values supplied to sitemap
- Added the ability to turn off or add custom xml namespaces
- CLI and library now can accept a stream which will automatically write both the index and the sitemaps. See README for usage.

### 6.0.0 breaking changes

- renamed XMLToISitemapOptions to XMLToSitemapOptions
- various error messages changed.
- removed deprecated Sitemap and SitemapIndex classes
- replaced buildSitemapIndex with SitemapIndexStream
- Typescript: various types renamed or made more specific, removed I prefix
- Typescript: view_count is now exclusively a number
- Typescript: `price:type` and `price:resolution` are now more restrictive types
- sitemap parser now returns a sitemapItem array rather than a config object that could be passed to the now removed Sitemap class
- CLI no longer accepts multiple file arguments or a mixture of file and streams except as a part of a parameter eg. prepend

## 5.1.0

Fix for #255. Baidu does not like timestamp in its sitemap.xml, this adds an option to truncate lastmod

```js
new SitemapStream({ lastmodDateOnly: true });
```

## 5.0.1

Fix for issue #254.

```sh
warning: failed to load external entity "./schema/all.xsd"
Schemas parser error : Failed to locate the main schema resource at './schema/all.xsd'.
WXS schema ./schema/all.xsd failed to compile
```

## 5.0.0

### Streams

This release is heavily focused on converting the core methods of this library to use streams. Why? Overall its made the API ~20% faster and uses only 10% or less of the memory. Some tradeoffs had to be made as in their nature streams are operate on individual segments of data as opposed to the whole. For instance, the streaming interface does not support removal of sitemap items as it does not hold on to a sitemap item after its converted to XML. It should however be possible to create your own transform that filters out entries should you desire it. The existing synchronous interfaces will remain for this release at least. Do not be surprised if they go away in a future breaking release.

### Sitemap Index

This library interface has been overhauled to use streams internally. Although it would have been preferable to convert this to a stream as well, I could not think of an interface that wouldn't actually end up more complex or confusing. It may be altered in the near future to accept a stream in addition to a simple list.

### Misc

- runnable examples, some pulled straight from README have been added to the examples directory.
- createSitemapsIndex was renamed createSitemapsAndIndex to more accurately reflect its function. It now returns a promise that resolves to true or throws with an error.
- You can now add to existing sitemap.xml files via the cli using `npx sitemap --prepend existingSitemap.xml < listOfNewURLs.json.txt`

### 5.0 Breaking Changes

- Dropped support for mobile sitemap - Google appears to have deleted their dtd and all references to it, strongly implying that they do not want you to use it. As its absence now breaks the validator, it has been dropped.
- normalizeURL(url, XMLRoot, hostname) -> normalizeURL(url, hostname)
  - The second argument was unused and has been eliminated
- Support for Node 8 dropped - Node 8 is reaching its EOL December 2019
- xslURL is being dropped from all apis - styling xml is out of scope of this library.
- createSitemapIndex has been converted to a promised based api rather than callback.
- createSitemapIndex now gzips by default - pass gzip: false to disable
- cacheTime is being dropped from createSitemapIndex - This didn't actually cache the way it was written so this should be a non-breaking change in effect.
- SitemapIndex as a class has been dropped. The class did all its work on construction and there was no reason to hold on to it once you created it.
- The options for the cli have been overhauled
  - `--json` is now inferred
  - `--line-separated` has been flipped to `--single-line-json` to by default output options immediately compatible with feeding back into sitemap

## 4.1.1

Add a pretty print option to `toString(false)`
pass true pretty print

Add an xmlparser that will output a config that would generate that same file

  cli:
    use --parser to output the complete config --line-separated to print out line
    separated config compatible with the --json input option for cli

  lib: import parseSitemap and pass it a stream

## 4.0.2

Fix npx script error - needs the shebang

## 4.0.1

Validation functions which depend on xmllint will now warn if you do not have xmllint installed.

## 4.0.0

This release is geared around overhauling the public api for this library. Many
options have been introduced over the years and this has lead to some inconsistencies
that make the library hard to use. Most have been cleaned up but a couple notable
items remain, including the confusing names of buildSitemapIndex and createSitemapIndex

- A new experimental CLI
  - stream in a list of urls stream out xml
  - validate your generated sitemap
- Sitemap video item now supports id element
- Several schema errors have been cleaned up.
- Docs have been updated and streamlined.

### breaking changes

- lastmod option parses all ISO8601 date-only strings as being in UTC rather than local time
  - lastmodISO is deprecated as it is equivalent to lastmod
  - lastmodfile now includes the file's time as well
  - lastmodrealtime is no longer necessary
- The default export of sitemap lib is now just createSitemap
- Sitemap constructor now uses a object for its constructor

```js
  const { Sitemap } = require('sitemap');
  const siteMap = new Sitemap({
    urls = [],
    hostname: 'https://example.com', // optional
    cacheTime = 0,
    xslUrl,
    xmlNs,
    level = 'warn'
  })
```

- Sitemap no longer accepts a single string for its url
- Drop support for node 6
- Remove callback on toXML - This had no performance benefit
- Direct modification of urls property on Sitemap has been dropped. Use add/remove/contains
- When a Sitemap item is generated with invalid options it no longer throws by default
  - instead it console warns.
  - if you'd like to pre-verify your data the `validateSMIOptions` function is
  now available
  - To get the previous behavior pass level `createSitemap({...otheropts, level: 'throw' }) // ErrorLevel.THROW for TS users`

## 3.2.2

- revert https everywhere added in 3.2.0. xmlns is not url.
- adds alias for lastmod in the form of lastmodiso
- fixes bug in lastmod option for buildSitemapIndex where option would be overwritten if a lastmod option was provided with a single url
- fixes #201, fixes #203

## 3.2.1

- no really fixes ts errors for real this time
- fixes #193 in PR #198

## 3.2.0

- fixes #192, fixes #193 typescript errors
- correct types on player:loc and restriction:relationship types
- use https urls in xmlns

## 3.1.0

- fixes #187, #188 typescript errors
- adds support for full precision priority #176

## 3.0.0

- Converted project to typescript
- properly encode URLs #179
- updated core dependency

### 3.0 breaking changes

This will likely not break anyone's code but we're bumping to be safe

- root domain URLs are now suffixed with / (eg. `https://www.ya.ru` -> `https://www.ya.ru/`) This is a side-effect of properly encoding passed in URLs
