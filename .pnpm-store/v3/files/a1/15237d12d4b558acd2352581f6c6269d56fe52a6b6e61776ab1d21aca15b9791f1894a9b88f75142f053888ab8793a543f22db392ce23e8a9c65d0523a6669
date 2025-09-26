# remark-rehype

[![Build][badge-build-image]][badge-build-url]
[![Coverage][badge-coverage-image]][badge-coverage-url]
[![Downloads][badge-downloads-image]][badge-downloads-url]
[![Size][badge-size-image]][badge-size-url]

**[remark][github-remark]** plugin that turns markdown into HTML to support
**[rehype][github-rehype]**.

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`defaultFootnoteBackContent(referenceIndex, rereferenceIndex)`](#defaultfootnotebackcontentreferenceindex-rereferenceindex)
  * [`defaultFootnoteBackLabel(referenceIndex, rereferenceIndex)`](#defaultfootnotebacklabelreferenceindex-rereferenceindex)
  * [`defaultHandlers`](#defaulthandlers)
  * [`unified().use(remarkRehype[, destination][, options])`](#unifieduseremarkrehype-destination-options)
  * [`Options`](#options)
* [Examples](#examples)
  * [Example: supporting HTML in markdown naïvely](#example-supporting-html-in-markdown-naïvely)
  * [Example: supporting HTML in markdown properly](#example-supporting-html-in-markdown-properly)
  * [Example: footnotes in languages other than English](#example-footnotes-in-languages-other-than-english)
* [HTML](#html-1)
* [CSS](#css)
* [Syntax tree](#syntax-tree)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Related](#related)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a [unified][github-unified] ([remark][github-remark])
plugin that switches from remark (the markdown ecosystem)
to rehype (the HTML ecosystem).
It does this by transforming the current markdown (mdast) syntax tree into an
HTML (hast) syntax tree.
remark plugins deal with mdast and rehype plugins deal with hast,
so plugins used after `remark-rehype` have to be rehype plugins.

The reason that there are different ecosystems for markdown and HTML is that
turning markdown into HTML is,
while frequently needed,
not the only purpose of markdown.
Checking (linting) and formatting markdown are also common use cases for
remark and markdown.
There are several aspects of markdown that do not translate 1-to-1 to HTML.
In some cases markdown contains more information than HTML:
for example,
there are several ways to add a link in markdown
(as in,
autolinks: `<https://url>`,
resource links: `[label](url)`,
and reference links with definitions:
`[label][id]` and `[id]: url`).
In other cases HTML contains more information than markdown:
there are many tags,
which add new meaning (semantics),
available in HTML that aren’t available in markdown.
If there was just one AST,
it would be quite hard to perform the tasks that several remark and rehype
plugins currently do.

## When should I use this?

This project is useful when you want to turn markdown to HTML.
It opens up a whole new ecosystem with tons of plugins to do all kinds of
things.
You can [minify HTML][github-rehype-minify],
[format HTML][github-rehype-format],
[make sure it’s safe][github-rehype-sanitize],
[highlight code][github-rehype-starry-night],
[add metadata][github-rehype-meta],
and a lot more.

A different plugin,
[`rehype-raw`][github-rehype-raw],
adds support for raw HTML written inside markdown.
This is a separate plugin because supporting HTML inside markdown is a heavy
task (performance and bundle size) and not always needed.
To use both together,
you also have to configure `remark-rehype` with `allowDangerousHtml: true` and
then use `rehype-raw`.

The rehype plugin [`rehype-remark`][github-rehype-remark] does the inverse of
this plugin.
It turns HTML into markdown.

If you don’t use plugins and want to access syntax trees,
you can use
[`mdast-util-to-hast`][github-mdast-util-to-hast].

## Install

This package is [ESM only][github-gist-esm].
In Node.js (version 16+),
install with [npm][npmjs-install]:

```sh
npm install remark-rehype
```

In Deno with [`esm.sh`][esmsh]:

```js
import remarkRehype from 'https://esm.sh/remark-rehype@11'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import remarkRehype from 'https://esm.sh/remark-rehype@11?bundle'
</script>
```

## Use

Say our document `example.md` contains:

```markdown
# Pluto

**Pluto** (minor-planet designation: **134340 Pluto**) is a
[dwarf planet](https://en.wikipedia.org/wiki/Dwarf_planet) in the
[Kuiper belt](https://en.wikipedia.org/wiki/Kuiper_belt).
```

…and our module `example.js` contains:

```js
import rehypeDocument from 'rehype-document'
import rehypeFormat from 'rehype-format'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import {read} from 'to-vfile'
import {unified} from 'unified'
import {reporter} from 'vfile-reporter'

const file = await unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeDocument)
  .use(rehypeFormat)
  .use(rehypeStringify)
  .process(await read('example.md'))

console.error(reporter(file))
console.log(String(file))
```

…then running `node example.js` yields:

```text
example.md: no issues found
```

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>example</title>
    <meta content="width=device-width, initial-scale=1" name="viewport">
  </head>
  <body>
    <h1>Pluto</h1>
    <p>
      <strong>Pluto</strong> (minor-planet designation: <strong>134340 Pluto</strong>) is a
      <a href="https://en.wikipedia.org/wiki/Dwarf_planet">dwarf planet</a> in the
      <a href="https://en.wikipedia.org/wiki/Kuiper_belt">Kuiper belt</a>.
    </p>
  </body>
</html>
```

## API

This package exports the identifiers
[`defaultFootnoteBackContent`][api-default-footnote-back-content],
[`defaultFootnoteBackLabel`][api-default-footnote-back-label],
and
[`defaultHandlers`][api-default-handlers].
The default export is [`remarkRehype`][api-remark-rehype].

### `defaultFootnoteBackContent(referenceIndex, rereferenceIndex)`

See [`defaultFootnoteBackContent` from
`mdast-util-to-hast`][github-mdast-util-to-hast-default-back-content].

### `defaultFootnoteBackLabel(referenceIndex, rereferenceIndex)`

See [`defaultFootnoteBackLabel` from
`mdast-util-to-hast`][github-mdast-util-to-hast-default-back-label].

### `defaultHandlers`

See [`defaultHandlers` from
`mdast-util-to-hast`][github-mdast-util-to-hast-default-handlers].

### `unified().use(remarkRehype[, destination][, options])`

Turn markdown into HTML.

###### Parameters

* `destination`
  ([`Processor`][github-unified-processor], optional)
  — processor
* `options`
  ([`Options`][api-options], optional)
  — configuration

###### Returns

Transform ([`Transformer`][github-unified-transformer]).

##### Notes

###### Signature

* if a [processor][github-unified-processor] is given,
  runs the (rehype) plugins used on it with a hast tree,
  then discards the result
  ([*bridge mode*][github-unified-mode])
* otherwise,
  returns a hast tree,
  the plugins used after `remarkRehype` are rehype plugins
  ([*mutate mode*][github-unified-mode])

> 👉 **Note**:
> it’s highly unlikely that you want to pass a `processor`.

###### HTML

Raw HTML is available in mdast as [`html`][github-mdast-html] nodes and can be
embedded in hast as semistandard `raw` nodes.
Most plugins ignore `raw` nodes but two notable ones don’t:

* [`rehype-stringify`][github-rehype-stringify] also has an option
  `allowDangerousHtml` which will output the raw HTML;
  this is typically discouraged as noted by the option name but is useful if
  you completely trust authors
* [`rehype-raw`][github-rehype-raw] can handle the raw embedded HTML strings by
  parsing them into standard hast nodes
  (`element`, `text`, etc);
  This is a heavy task as it needs a full HTML parser,
  but it is the only way to support untrusted content

###### Footnotes

Many options supported here relate to footnotes.
Footnotes are not specified by CommonMark,
which we follow by default.
They are supported by GitHub,
so footnotes can be enabled in markdown with [`remark-gfm`][github-remark-gfm].

The options `footnoteBackLabel` and `footnoteLabel` define natural language
that explains footnotes,
which is hidden for sighted users but shown to assistive technology.
When your page is not in English,
you must define translated values.

Back references use ARIA attributes,
but the section label itself uses a heading that is hidden with an
`sr-only` class.
To show it to sighted users,
define different attributes in `footnoteLabelProperties`.

###### Clobbering

Footnotes introduces a problem,
as it links footnote calls to footnote definitions on the page through `id`
attributes generated from user content,
which results in DOM clobbering.

DOM clobbering is this:

```html
<p id=x></p>
<script>alert(x) // `x` now refers to the DOM `p#x` element</script>
```

Elements by their ID are made available by browsers on the `window` object,
which is a security risk.
Using a prefix solves this problem.

More information on how to handle clobbering and the prefix is explained in
[*Example: headings (DOM clobbering)* in
`rehype-sanitize`][github-rehype-sanitize-clobber].

###### Unknown nodes

Unknown nodes are nodes with a type that isn’t in `handlers` or `passThrough`.
The default behavior for unknown nodes is:

* when the node has a `value`
  (and doesn’t have `data.hName`, `data.hProperties`, or `data.hChildren`,
  see later),
  create a hast `text` node
* otherwise,
  create a `<div>` element
  (which could be changed with `data.hName`),
  with its children mapped from mdast to hast as well

This behavior can be changed by passing an `unknownHandler`.

### `Options`

Configuration (TypeScript type).

###### Fields

* `allowDangerousHtml`
  (`boolean`, default: `false`)
  — whether to persist raw HTML in markdown in the hast tree
* `clobberPrefix`
  (`string`, default: `'user-content-'`)
  — prefix to use before the `id` property on footnotes to prevent them from
  *clobbering*
* `footnoteBackContent`
  ([`FootnoteBackContentTemplate` from
  `mdast-util-to-hast`][github-mdast-util-to-hast-back-content-template]
  or `string`, default:
  [`defaultFootnoteBackContent` from
  `mdast-util-to-hast`][github-mdast-util-to-hast-default-back-content])
  — content of the backreference back to references
* `footnoteBackLabel`
  ([`FootnoteBackLabelTemplate` from
  `mdast-util-to-hast`][github-mdast-util-to-hast-back-label-template]
  or `string`, default:
  [`defaultFootnoteBackLabel` from
  `mdast-util-to-hast`][github-mdast-util-to-hast-default-back-label])
  — label to describe the backreference back to references
* `footnoteLabel`
  (`string`, default: `'Footnotes'`)
  — label to use for the footnotes section (affects screen readers)
* `footnoteLabelProperties`
  ([`Properties` from `@types/hast`][github-hast-properties], default:
  `{className: ['sr-only']}`)
  — properties to use on the footnote label
  (note that `id: 'footnote-label'` is always added as footnote calls use it
  with `aria-describedby` to provide an accessible label)
* `footnoteLabelTagName`
  (`string`, default: `h2`)
  — tag name to use for the footnote label
* `handlers`
  ([`Handlers` from
  `mdast-util-to-hast`][github-mdast-util-to-hast-handlers], optional)
  — extra handlers for nodes
* `passThrough`
  (`Array<Nodes['type']>`, optional)
  — list of custom mdast node types to pass through (keep) in hast (note that
  the node itself is passed, but eventual children are transformed)
* `unknownHandler`
  ([`Handler` from
  `mdast-util-to-hast`][github-mdast-util-to-hast-handler], optional)
  — handle all unknown nodes

## Examples

### Example: supporting HTML in markdown naïvely

If you completely trust the authors of the input markdown and want to allow them
to write HTML inside markdown,
you can pass `allowDangerousHtml` to `remark-rehype` and `rehype-stringify`:

```js
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import {unified} from 'unified'

const file = await unified()
  .use(remarkParse)
  .use(remarkRehype, {allowDangerousHtml: true})
  .use(rehypeStringify, {allowDangerousHtml: true})
  .process('<a href="/wiki/Dysnomia_(moon)" onclick="alert(1)">Dysnomia</a>')

console.log(String(file))
```

Yields:

```html
<p><a href="/wiki/Dysnomia_(moon)" onclick="alert(1)">Dysnomia</a></p>
```

> ⚠️ **Danger**:
> observe that the XSS attack through `onclick` is present.

### Example: supporting HTML in markdown properly

If you do not trust the authors of the input markdown,
or if you want to make sure that rehype plugins can see HTML embedded in
markdown,
use [`rehype-raw`][github-rehype-raw].
The following example passes `allowDangerousHtml` to `remark-rehype`,
then turns the raw embedded HTML into proper HTML nodes with `rehype-raw`,
and finally sanitizes the HTML by only allowing safe things with
`rehype-sanitize`:

```js
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import rehypeRaw from 'rehype-raw'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import {unified} from 'unified'

const file = await unified()
  .use(remarkParse)
  .use(remarkRehype, {allowDangerousHtml: true})
  .use(rehypeRaw)
  .use(rehypeSanitize)
  .use(rehypeStringify)
  .process('<a href="/wiki/Dysnomia_(moon)" onclick="alert(1)">Dysnomia</a>')

console.log(String(file))
```

Running that code yields:

```html
<p><a href="/wiki/Dysnomia_(moon)">Dysnomia</a></p>
```

> ⚠️ **Danger**:
> observe that the XSS attack through `onclick` is **not** present.

### Example: footnotes in languages other than English

If you know that the markdown is authored in a language other than English,
and you’re using `remark-gfm` to match how GitHub renders markdown,
and you know that footnotes are (or can?) be used,
you should translate the labels associated with them.

Let’s first set the stage:

```js
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

const doc = `
Ceres ist nach der römischen Göttin des Ackerbaus benannt;
ihr astronomisches Symbol ist daher eine stilisierte Sichel: ⚳.[^nasa-2015]

[^nasa-2015]: JPL/NASA:
    [*What is a Dwarf Planet?*](https://www.jpl.nasa.gov/infographics/what-is-a-dwarf-planet)
    In: Jet Propulsion Laboratory.
    22. April 2015,
    abgerufen am 19. Januar 2022 (englisch).
`

const file = await unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeStringify)
  .process(doc)

console.log(String(file))
```

Yields:

```html
<p>Ceres ist nach der römischen Göttin des Ackerbaus benannt;
ihr astronomisches Symbol ist daher eine stilisierte Sichel: ⚳.<sup><a href="#user-content-fn-nasa-2015" id="user-content-fnref-nasa-2015" data-footnote-ref aria-describedby="footnote-label">1</a></sup></p>
<section data-footnotes class="footnotes"><h2 class="sr-only" id="footnote-label">Footnotes</h2>
<ol>
<li id="user-content-fn-nasa-2015">
<p>JPL/NASA:
<a href="https://www.jpl.nasa.gov/infographics/what-is-a-dwarf-planet"><em>What is a Dwarf Planet?</em></a>
In: Jet Propulsion Laboratory.
22. April 2015,
abgerufen am 19. Januar 2022 (englisch). <a href="#user-content-fnref-nasa-2015" data-footnote-backref="" aria-label="Back to reference 1" class="data-footnote-backref">↩</a></p>
</li>
</ol>
</section>
```

This is a mix of English and German that isn’t very accessible,
such as that screen readers can’t handle it nicely.
Let’s say our program *does* know that the markdown is in German.
In that case,
it’s important to translate and define the labels relating to footnotes so that
screen reader users can properly pronounce the page:

```diff
@@ -18,7 +18,16 @@ ihr astronomisches Symbol ist daher eine stilisierte Sichel: ⚳.[^nasa-2015]
 const file = await unified()
   .use(remarkParse)
   .use(remarkGfm)
-  .use(remarkRehype)
+  .use(remarkRehype, {
+    footnoteBackLabel(referenceIndex, rereferenceIndex) {
+      return (
+        'Hochspringen nach: ' +
+        (referenceIndex + 1) +
+        (rereferenceIndex > 1 ? '-' + rereferenceIndex : '')
+      )
+    },
+    footnoteLabel: 'Fußnoten'
+  })
   .use(rehypeStringify)
   .process(doc)
```

Running the code with the above patch applied,
yields:

```diff
@@ -1,13 +1,13 @@
 <p>Ceres ist nach der römischen Göttin des Ackerbaus benannt;
 ihr astronomisches Symbol ist daher eine stilisierte Sichel: ⚳.<sup><a href="#user-content-fn-nasa-2015" id="user-content-fnref-nasa-2015" data-footnote-ref aria-describedby="footnote-label">1</a></sup></p>
-<section data-footnotes class="footnotes"><h2 class="sr-only" id="footnote-label">Footnotes</h2>
+<section data-footnotes class="footnotes"><h2 class="sr-only" id="footnote-label">Fußnoten</h2>
 <ol>
 <li id="user-content-fn-nasa-2015">
 <p>JPL/NASA:
 <a href="https://www.jpl.nasa.gov/infographics/what-is-a-dwarf-planet"><em>What is a Dwarf Planet?</em></a>
 In: Jet Propulsion Laboratory.
 22. April 2015,
-abgerufen am 19. Januar 2022 (englisch). <a href="#user-content-fnref-nasa-2015" data-footnote-backref="" aria-label="Back to reference 1" class="data-footnote-backref">↩</a></p>
+abgerufen am 19. Januar 2022 (englisch). <a href="#user-content-fnref-nasa-2015" data-footnote-backref="" aria-label="Hochspringen nach: 1" class="data-footnote-backref">↩</a></p>
 </li>
 </ol>
 </section>
```

## HTML

See [*Algorithm* in
`mdast-util-to-hast`](https://github.com/syntax-tree/mdast-util-to-hast#algorithm)
for info on how mdast (markdown) nodes are transformed to hast (HTML).

## CSS

Assuming you know how to use (semantic) HTML and CSS,
then it should generally be straightforward to style the HTML produced by this
plugin.
With CSS,
you can get creative and style the results as you please.

Some semistandard features,
notably GFMs tasklists and footnotes,
generate HTML that be unintuitive,
as it matches exactly what GitHub produces for their website.
There is a project,
[`sindresorhus/github-markdown-css`][github-markdown-css],
that exposes the stylesheet that GitHub uses for rendered markdown,
which might either be inspirational for more complex features,
or can be used as-is to exactly match how GitHub styles rendered markdown.

The following CSS is needed to make footnotes look a bit like GitHub:

```css
/* Style the footnotes section. */
.footnotes {
  font-size: smaller;
  color: #8b949e;
  border-top: 1px solid #30363d;
}

/* Hide the section label for visual users. */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  word-wrap: normal;
  border: 0;
}

/* Place `[` and `]` around footnote calls. */
[data-footnote-ref]::before {
  content: '[';
}

[data-footnote-ref]::after {
  content: ']';
}
```

## Syntax tree

This projects turns [mdast][github-mdast] (markdown) into [hast][github-hast]
(HTML).

It extends mdast by supporting `data` fields on mdast nodes to specify how they
should be transformed.
See [*Fields on nodes* in
`mdast-util-to-hast`](https://github.com/syntax-tree/mdast-util-to-hast#fields-on-nodes)
for info on how these fields work.

It extends hast by using a semistandard raw nodes for raw HTML.
See the [*HTML* note above](#html) for more info.

## Types

This package is fully typed with [TypeScript][].
It exports the types
[`Options`][api-options].

The types of `mdast-util-to-hast` can be referenced to register data fields
with `@types/mdast` and `Raw` nodes with `@types/hast`.

```js
/**
 * @import {Root as HastRoot} from 'hast'
 * @import {Root as MdastRoot} from 'mdast'
 * @import {} from 'mdast-util-to-hast'
 */

import {visit} from 'unist-util-visit'

const mdastNode = /** @type {MdastRoot} */ ({/* … */})
console.log(mdastNode.data?.hName) // Typed as `string | undefined`.

const hastNode = /** @type {HastRoot} */ ({/* … */})

visit(hastNode, function (node) {
  // `node` can now be `raw`.
})
```

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release,
we drop support for unmaintained versions of Node.
This means we try to keep the current release line,
`remark-rehype@11`,
compatible with Node.js 16.

This plugin works with `unified` version 6+,
`remark-parse` version 3+
(used in `remark` version 7),
and `rehype-stringify` version 3+
(used in `rehype` version 5).

## Security

Use of `remark-rehype` can open you up to a
[cross-site scripting (XSS)][wikipedia-xss] attack.
Embedded **[hast][github-hast]** properties
(`hName`, `hProperties`, `hChildren`)
in [mdast][github-mdast],
custom handlers,
and the `allowDangerousHtml` option all provide openings.
Use [`rehype-sanitize`][github-rehype-sanitize] to make the tree safe.

## Related

* [`rehype-raw`][github-rehype-raw]
  — rehype plugin to parse the tree again and support `raw` nodes
* [`rehype-sanitize`][github-rehype-sanitize]
  — rehype plugin to sanitize HTML
* [`rehype-remark`][github-rehype-remark]
  — rehype plugin to turn HTML into markdown
* [`rehype-retext`](https://github.com/rehypejs/rehype-retext)
  — rehype plugin to support retext
* [`remark-retext`](https://github.com/remarkjs/remark-retext)
  — remark plugin to support retext

## Contribute

See [`contributing.md`][health-contributing] in [`remarkjs/.github`][health]
for ways to get started.
See [`support.md`][health-support] for ways to get help.

This project has a [code of conduct][health-coc].
By interacting with this repository,
organization,
or community you agree to abide by its terms.

## License

[MIT][file-license] © [Titus Wormer][wooorm]

<!-- Definitions -->

[api-default-footnote-back-content]: #defaultfootnotebackcontentreferenceindex-rereferenceindex

[api-default-footnote-back-label]: #defaultfootnotebacklabelreferenceindex-rereferenceindex

[api-default-handlers]: #defaulthandlers

[api-options]: #options

[api-remark-rehype]: #unifieduseremarkrehype-destination-options

[badge-build-image]: https://github.com/remarkjs/remark-rehype/workflows/main/badge.svg

[badge-build-url]: https://github.com/remarkjs/remark-rehype/actions

[badge-coverage-image]: https://img.shields.io/codecov/c/github/remarkjs/remark-rehype.svg

[badge-coverage-url]: https://codecov.io/github/remarkjs/remark-rehype

[badge-downloads-image]: https://img.shields.io/npm/dm/remark-rehype.svg

[badge-downloads-url]: https://www.npmjs.com/package/remark-rehype

[badge-size-image]: https://img.shields.io/bundlejs/size/remark-rehype

[badge-size-url]: https://bundlejs.com/?q=remark-rehype

[esmsh]: https://esm.sh

[file-license]: license

[github-gist-esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[github-hast]: https://github.com/syntax-tree/hast

[github-hast-properties]: https://github.com/syntax-tree/hast#properties

[github-markdown-css]: https://github.com/sindresorhus/github-markdown-css

[github-mdast]: https://github.com/syntax-tree/mdast

[github-mdast-html]: https://github.com/syntax-tree/mdast#html

[github-mdast-util-to-hast]: https://github.com/syntax-tree/mdast-util-to-hast

[github-mdast-util-to-hast-back-content-template]: https://github.com/syntax-tree/mdast-util-to-hast#footnotebackcontenttemplate

[github-mdast-util-to-hast-back-label-template]: https://github.com/syntax-tree/mdast-util-to-hast#footnotebacklabeltemplate

[github-mdast-util-to-hast-default-back-content]: https://github.com/syntax-tree/mdast-util-to-hast#defaultfootnotebackcontentreferenceindex-rereferenceindex

[github-mdast-util-to-hast-default-back-label]: https://github.com/syntax-tree/mdast-util-to-hast#defaultfootnotebacklabelreferenceindex-rereferenceindex

[github-mdast-util-to-hast-default-handlers]: https://github.com/syntax-tree/mdast-util-to-hast#defaulthandlers

[github-mdast-util-to-hast-handler]: https://github.com/syntax-tree/mdast-util-to-hast#handler

[github-mdast-util-to-hast-handlers]: https://github.com/syntax-tree/mdast-util-to-hast#handlers

[github-rehype]: https://github.com/rehypejs/rehype

[github-rehype-format]: https://github.com/rehypejs/rehype-format

[github-rehype-meta]: https://github.com/rehypejs/rehype-meta

[github-rehype-minify]: https://github.com/rehypejs/rehype-minify

[github-rehype-raw]: https://github.com/rehypejs/rehype-raw

[github-rehype-remark]: https://github.com/rehypejs/rehype-remark

[github-rehype-sanitize]: https://github.com/rehypejs/rehype-sanitize

[github-rehype-sanitize-clobber]: https://github.com/rehypejs/rehype-sanitize#example-headings-dom-clobbering

[github-rehype-starry-night]: https://github.com/rehypejs/rehype-starry-night

[github-rehype-stringify]: https://github.com/rehypejs/rehype/tree/main/packages/rehype-stringify

[github-remark]: https://github.com/remarkjs/remark

[github-remark-gfm]: https://github.com/remarkjs/remark-gfm

[github-unified]: https://github.com/unifiedjs/unified

[github-unified-mode]: https://github.com/unifiedjs/unified#transforming-between-ecosystems

[github-unified-processor]: https://github.com/unifiedjs/unified#processor

[github-unified-transformer]: https://github.com/unifiedjs/unified#transformer

[health]: https://github.com/remarkjs/.github

[health-coc]: https://github.com/remarkjs/.github/blob/main/code-of-conduct.md

[health-contributing]: https://github.com/remarkjs/.github/blob/main/contributing.md

[health-support]: https://github.com/remarkjs/.github/blob/main/support.md

[npmjs-install]: https://docs.npmjs.com/cli/install

[typescript]: https://www.typescriptlang.org

[wikipedia-xss]: https://en.wikipedia.org/wiki/Cross-site_scripting

[wooorm]: https://wooorm.com
