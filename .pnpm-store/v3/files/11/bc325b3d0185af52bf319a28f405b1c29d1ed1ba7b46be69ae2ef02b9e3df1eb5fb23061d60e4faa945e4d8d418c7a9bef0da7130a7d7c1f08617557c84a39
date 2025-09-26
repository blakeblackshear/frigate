# micromark-extension-mdx-jsx

[![Build][badge-build-image]][badge-build-url]
[![Coverage][badge-coverage-image]][badge-coverage-url]
[![Downloads][badge-downloads-image]][badge-downloads-url]
[![Size][badge-size-image]][badge-size-url]

[micromark][github-micromark] extension to support [MDX][mdxjs] JSX
(`<Component />`).

## Contents

* [What is this?](#what-is-this)
* [When to use this](#when-to-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`mdxJsx(options?)`](#mdxjsxoptions)
  * [`Options`](#options)
* [Authoring](#authoring)
* [Syntax](#syntax)
* [Errors](#errors)
  * [Unexpected end of file $at, expected $expect](#unexpected-end-of-file-at-expected-expect)
  * [Unexpected character $at, expected $expect](#unexpected-character-at-expected-expect)
  * [Unexpected lazy line in container, expected line to be…](#unexpected-lazy-line-in-container-expected-line-to-be)
* [Tokens](#tokens)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Related](#related)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package contains an extension that adds support for the JSX syntax enabled
by [MDX][mdxjs] to [`micromark`][github-micromark].
These extensions are used inside MDX.
It mostly matches how JSX works in most places that support it
(TypeScript, Babel, esbuild, SWC, etc).

This package can be made aware or unaware of JavaScript syntax.
When unaware,
expressions could include Rust or variables or whatnot.

## When to use this

This project is useful when you want to support JSX in markdown.

You can use this extension when you are working with
[`micromark`][github-micromark].
To support all MDX features,
use [`micromark-extension-mdxjs`][github-micromark-extension-mdxjs] instead.

When you need a syntax tree,
combine this package with [`mdast-util-mdx-jsx`][github-mdast-util-mdx-jsx].

All these packages are used in [`remark-mdx`][mdxjs-remark-mdx],
which focusses on making it easier to transform content by abstracting these
internals away.

When you are using [`mdx-js/mdx`][mdxjs],
all of this is already included.

## Install

This package is [ESM only][github-gist-esm].
In Node.js (version 16+),
install with [npm][npmjs-install]:

```sh
npm install micromark-extension-mdx-jsx
```

In Deno with [`esm.sh`][esmsh]:

```js
import {mdxJsx} from 'https://esm.sh/micromark-extension-mdx-jsx@2'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {mdxJsx} from 'https://esm.sh/micromark-extension-mdx-jsx@2?bundle'
</script>
```

## Use

```js
import {micromark} from 'micromark'
import {mdxJsx} from 'micromark-extension-mdx-jsx'

const output = micromark('a <b c d="e" /> f', {extensions: [mdxJsx()]})

console.log(output)
```

Yields:

```html
<p>a  f</p>
```

…which is useless:
go to a syntax tree with
[`mdast-util-from-markdown`][github-mdast-util-from-markdown] and
[`mdast-util-mdx-jsx`][github-mdast-util-mdx-jsx] instead.

## API

This package exports the identifier [`mdxJsx`][api-mdx-jsx].
There is no default export.

The export map supports the [`development` condition][nodejs-api-conditions].
Run `node --conditions development module.js` to get instrumented dev code.
Without this condition,
production code is loaded.

### `mdxJsx(options?)`

Create an extension for `micromark` to enable MDX JSX syntax.

###### Parameters

* `options`
  ([`Options`][api-options], optional)
  — configuration

###### Returns

Extension for `micromark` that can be passed in `extensions` to enable MDX
JSX syntax ([`Extension`][github-micromark-extension]).

### `Options`

Configuration (TypeScript type).

###### Fields

* `acorn`
  ([`Acorn`][github-acorn], optional)
  — acorn parser to use
* `acornOptions`
  ([`AcornOptions`][github-acorn-options],
  default:
  `{ecmaVersion: 2024, locations: true, sourceType: 'module'}`)
  — configuration for acorn;
  all fields except `locations` can be set
* `addResult`
  (`boolean`, default: `false`)
  — whether to add `estree` fields to tokens with results from acorn

## Authoring

When authoring markdown with JSX,
keep in mind that MDX is a whitespace sensitive and line-based language,
while JavaScript is insensitive to whitespace.
This affects how markdown and JSX interleave with eachother in MDX.
For more info on how it works,
see [§ Interleaving][mdxjs-interleaving] on the MDX site.

###### Comments inside tags

JavaScript comments in JSX are not supported.

Incorrect:

```mdx-invalid
<hi/*comment!*//>
<hello// comment!
/>
```

Correct:

```mdx
<hi/>
<hello
/>
```

A PR that adds support for them would be accepted.

###### Element or fragment attribute values

JSX elements or JSX fragments as attribute values are not supported.
The reason for this change is that it would be confusing whether markdown
would work.

Incorrect:

```mdx-invalid
<welcome name=<>Venus</> />
<welcome name=<span>Pluto</span> />
```

Correct:

```mdx
<welcome name='Mars' />
<welcome name={<span>Jupiter</span>} />
```

###### Greater than (`>`) and right curly brace (`}`)

JSX does not allow U+003E GREATER THAN (`>`) or U+007D RIGHT CURLY BRACE
(`}`) literally in text,
they need to be encoded as character references
(or expressions).
There is no good reason for this (some JSX parsers agree with us and don’t
crash either).
Therefore,
in MDX,
U+003E GREATER THAN (`>`) and U+007D RIGHT CURLY BRACE (`}`) are fine literally
and don’t need to be encoded.

## Syntax

JSX forms with the following BNF:

<!--grammar start-->

<pre><code><a id=x-mdx-jsx-flow href=#x-mdx-jsx-flow>mdx_jsx_flow</a> ::= <a href=#x-mdx-jsx>mdx_jsx</a> *<a href=#x-space-or-tab>space_or_tab</a> [<a href=#x-mdx-jsx>mdx_jsx</a> *<a href=#x-space-or-tab>space_or_tab</a>]
<a id=x-mdx-jsx-text href=#x-mdx-jsx-text>mdx_jsx_text</a> ::= <a href=#x-mdx-jsx>mdx_jsx</a>

; constraint: markdown whitespace (`<a href=#x-space-or-tab>space_or_tab</a> | <a href=#x-eol>eol</a>`) is NOT
; allowed directly after `&lt;` in order to allow `1 &lt; 3` in markdown.
<a id=x-mdx-jsx href=#x-mdx-jsx>mdx_jsx</a> ::=
  '&lt;' [<a href=#x-closing>closing</a>]
  [*<a href=#x-whitespace>whitespace</a> <a href=#x-name>name</a> [<a href=#x-attributes-after-identifier>attributes_after_identifier</a>] [<a href=#x-closing>closing</a>]]
  *<a href=#x-whitespace>whitespace</a> '>'

<a id=x-attributes-after-identifier href=#x-attributes-after-identifier>attributes_after_identifier</a> ::=
  1*<a href=#x-whitespace>whitespace</a> (<a href=#x-attributes-boolean>attributes_boolean</a> | <a href=#x-attributes-value>attributes_value</a>) |
  *<a href=#x-whitespace>whitespace</a> <a href=#x-attributes-expression>attributes_expression</a> |
<a id=x-attributes-after-value href=#x-attributes-after-value>attributes_after_value</a> ::=
  *<a href=#x-whitespace>whitespace</a> (<a href=#x-attributes-boolean>attributes_boolean</a> | <a href=#x-attributes-expression>attributes_expression</a> | <a href=#x-attributes-value>attributes_value</a>)
<a id=x-attributes-boolean href=#x-attributes-boolean>attributes_boolean</a> ::= <a href=#x-key>key</a> [<a href=#x-attributes-after-identifier>attributes_after_identifier</a>]
; Note: in gnostic mode the value of the expression must instead be a single valid ES spread
; expression
<a id=x-attributes-expression href=#x-attributes-expression>attributes_expression</a> ::= <a href=#x-expression>expression</a> [<a href=#x-attributes-after-value>attributes_after_value</a>]
<a id=x-attributes-value href=#x-attributes-value>attributes_value</a> ::= <a href=#x-key>key</a> <a href=#x-initializer>initializer</a> [<a href=#x-attributes-after-value>attributes_after_value</a>]

<a id=x-closing href=#x-closing>closing</a> ::= *<a href=#x-whitespace>whitespace</a> '/'

<a id=x-name href=#x-name>name</a> ::= <a href=#x-identifier>identifier</a> [<a href=#x-local>local</a> | <a href=#x-members>members</a>]
<a id=x-key href=#x-key>key</a> ::= <a href=#x-identifier>identifier</a> [<a href=#x-local>local</a>]
<a id=x-local href=#x-local>local</a> ::= *<a href=#x-whitespace>whitespace</a> ':' *<a href=#x-whitespace>whitespace</a> <a href=#x-identifier>identifier</a>
<a id=x-members href=#x-members>members</a> ::= <a href=#x-member>member</a> *<a href=#x-member>member</a>
<a id=x-member href=#x-member>member</a> ::= *<a href=#x-whitespace>whitespace</a> '.' *<a href=#x-whitespace>whitespace</a> <a href=#x-identifier>identifier</a>

<a id=x-identifier href=#x-identifier>identifier</a> ::= <a href=#x-identifier-start>identifier_start</a> *<a href=#x-identifier-part>identifier_part</a>
<a id=x-initializer href=#x-initializer>initializer</a> ::= *<a href=#x-whitespace>whitespace</a> '=' *<a href=#x-whitespace>whitespace</a> <a href=#x-value>value</a>
<a id=x-value href=#x-value>value</a> ::= <a href=#x-double-quoted>double_quoted</a> | <a href=#x-single-quoted>single_quoted</a> | <a href=#x-expression>expression</a>
; Note: in gnostic mode the value must instead be a single valid ES expression
<a id=x-expression href=#x-expression>expression</a> ::= '{' *(<a href=#x-expression-text>expression_text</a> | <a href=#x-expression>expression</a>) '}'

<a id=x-double-quoted href=#x-double-quoted>double_quoted</a> ::= '"' *<a href=#x-double-quoted-text>double_quoted_text</a> '"'
<a id=x-single-quoted href=#x-single-quoted>single_quoted</a> ::= "'" *<a href=#x-single-quoted-text>single_quoted_text</a> "'"

<a id=x-whitespace href=#x-whitespace>whitespace</a> ::= <a href=#x-es-whitespace>es_whitespace</a>
<a id=x-double-quoted-text href=#x-double-quoted-text>double_quoted_text</a> ::= char - '"'
<a id=x-single-quoted-text href=#x-single-quoted-text>single_quoted_text</a> ::= char - "'"
<a id=x-expression-text href=#x-expression-text>expression_text</a> ::= char - '{' - '}'
<a id=x-identifier-start href=#x-identifier-start>identifier_start</a> ::= <a href=#x-es-identifier-start>es_identifier_start</a>
<a id=x-identifier-part href=#x-identifier-part>identifier_part</a> ::= <a href=#x-es-identifier-part>es_identifier_part</a> | '-'

<a id=x-space-or-tab href=#x-space-or-tab>space_or_tab</a> ::= '\t' | ' '
<a id=x-eol href=#x-eol>eol</a> ::= '\n' | '\r' | '\r\n'

; ECMAScript
; See “IdentifierStart”: &lt;<a href=https://tc39.es/ecma262/#prod-IdentifierStart>https://tc39.es/ecma262/#prod-IdentifierStart</a>>
<a id=x-es-identifier-start href=#x-es-identifier-start>es_identifier_start</a> ::= ?
; See “IdentifierPart”: &lt;<a href=https://tc39.es/ecma262/#prod-IdentifierPart>https://tc39.es/ecma262/#prod-IdentifierPart</a>>
<a id=x-es-identifier-part href=#x-es-identifier-part>es_identifier_part</a> ::= ?
; See “Whitespace”: &lt;<a href=https://tc39.es/ecma262/#prod-WhiteSpace>https://tc39.es/ecma262/#prod-WhiteSpace</a>>
<a id=x-es-whitespace href=#x-es-whitespace>es_whitespace</a> ::= ?
</code></pre>

<!--grammar end-->

As the flow construct occurs in flow,
like all flow constructs,
it must be followed by an eol (line ending) or eof (end of file).

The grammar for JSX in markdown is much stricter than that of HTML in
markdown.
The primary benefit of this is that tags are parsed into tokens,
and thus can be processed.
Another,
arguable,
benefit of this is that it comes with syntax errors:
if an author types something that is nonsensical,
an error is thrown with information about where it happened,
what occurred,
and what was expected instead.

This extension supports expressions both aware and unaware to JavaScript
(respectively gnostic and agnostic).
Depending on whether acorn is passed,
either valid JavaScript must be used in expressions,
or arbitrary text (such as Rust code or so) can be used.

More on this can be found in
[§ Syntax of `micromark-extension-mdx-expression`][github-expression-syntax].

## Errors

In aware (gnostic) mode,
expressions are parsed with
[`micromark-extension-mdx-expression`][github-micromark-expression],
which throws some more errors.

### Unexpected end of file $at, expected $expect

This error occurs for many different reasons if something was opened but not
closed
(source: `micromark-extension-mdx-jsx`, rule id: `unexpected-eof`).

Some examples are:

```mdx-invalid
<
</
<a
<a:
<a.
<a b
<a b:
<a b=
<a b="
<a b='
<a b={
<a/
```

### Unexpected character $at, expected $expect

This error occurs for many different reasons if an unexpected character is seen
(source: `micromark-extension-mdx-jsx`, rule id: `unexpected-character`).

Some examples are:

```mdx-invalid
<.>
</.>
<a?>
<a:+>
<a./>
<a b!>
<a b:1>
<a b=>
<a/->
```

### Unexpected lazy line in container, expected line to be…

This error occurs if a `<` was seen in a container which then has lazy content
(source: `micromark-extension-mdx-jsx`, rule id: `unexpected-lazy`).
For example:

```mdx-invalid
> <a
b>
```

## Tokens

Many tokens are used:

* `mdxJsxFlowTag` for the whole JSX tag (`<a>`)
* `mdxJsxTextTag` ^
* `mdxJsxFlowTagMarker` for the tag markers (`<`, `>`)
* `mdxJsxTextTagMarker` ^
* `mdxJsxFlowTagClosingMarker` for the `/` marking a closing tag (`</a>`)
* `mdxJsxTextTagClosingMarker` ^
* `mdxJsxFlowTagSelfClosingMarker` for the `/` marking a self-closing tag
  (`<a/>`)
* `mdxJsxTextTagSelfClosingMarker` ^
* `mdxJsxFlowTagName` for the whole tag name (`a:b` in `<a:b>`)
* `mdxJsxTextTagName` ^
* `mdxJsxFlowTagNamePrimary` for the first name (`a` in `<a:b>`)
* `mdxJsxTextTagNamePrimary` ^
* `mdxJsxFlowTagNameMemberMarker` for the `.` marking in members (`<a.b>`)
* `mdxJsxTextTagNameMemberMarker` ^
* `mdxJsxFlowTagNameMember` for member names (`b` in `<a:b>`)
* `mdxJsxTextTagNameMember` ^
* `mdxJsxFlowTagNamePrefixMarker` for the `:` between primary and local
  (`<a:b>`)
* `mdxJsxTextTagNamePrefixMarker` ^
* `mdxJsxFlowTagNameLocal` for the local name (`b` in `<a:b>`)
* `mdxJsxTextTagNameLocal` ^
* `mdxJsxFlowTagExpressionAttribute` for whole expression attributes
  (`<a {...b}>`)
* `mdxJsxTextTagExpressionAttribute` ^
* `mdxJsxFlowTagExpressionAttributeMarker` for `{`, `}` in expression
  attributes
* `mdxJsxTextTagExpressionAttributeMarker` ^
* `mdxJsxFlowTagExpressionAttributeValue` for chunks of what’s inside
  expression attributes
* `mdxJsxTextTagExpressionAttributeValue` ^
* `mdxJsxFlowTagAttribute` for a whole normal attribute (`<a b>`)
* `mdxJsxTextTagAttribute` ^
* `mdxJsxFlowTagAttributeName` for the whole name of an attribute (`b:c` in
  `<a b:c>`)
* `mdxJsxTextTagAttributeName` ^
* `mdxJsxFlowTagAttributeNamePrimary` for the first name of an attribute (`b`
  in `<a b:c>`)
* `mdxJsxTextTagAttributeNamePrimary` ^
* `mdxJsxFlowTagAttributeNamePrefixMarker` for the `:` between primary and
  local (`<a b:c>`)
* `mdxJsxTextTagAttributeNamePrefixMarker` ^
* `mdxJsxFlowTagAttributeNameLocal` for the local name of an attribute (`c`
  in `<a b:c>`)
* `mdxJsxTextTagAttributeNameLocal` ^
* `mdxJsxFlowTagAttributeInitializerMarker` for the `=` between an attribute
  name and value
* `mdxJsxTextTagAttributeInitializerMarker` ^
* `mdxJsxFlowTagAttributeValueLiteral` for a string attribute value
  (`<a b="">`)
* `mdxJsxTextTagAttributeValueLiteral` ^
* `mdxJsxFlowTagAttributeValueLiteralMarker` for the quotes around a string
  attribute value (`"` or `'`)
* `mdxJsxTextTagAttributeValueLiteralMarker` ^
* `mdxJsxFlowTagAttributeValueLiteralValue` for chunks of what’s inside
  string attribute values
* `mdxJsxTextTagAttributeValueLiteralValue` ^
* `mdxJsxFlowTagAttributeValueExpression` for an expression attribute value
  (`<a b={1}>`)
* `mdxJsxTextTagAttributeValueExpression` ^
* `mdxJsxFlowTagAttributeValueExpressionMarker` for the `{` and `}` of
  expression attribute values
* `mdxJsxTextTagAttributeValueExpressionMarker` ^
* `mdxJsxFlowTagAttributeValueExpressionValue` for chunks of what’s inside
  expression attribute values
* `mdxJsxTextTagAttributeValueExpressionValue` ^

## Types

This package is fully typed with [TypeScript][].
It exports the additional type [`Options`][api-options].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release,
we drop support for unmaintained versions of Node.
This means we try to keep the current release line,
`micromark-extension-mdx-jsx@2`,
compatible with Node.js 16.

This package works with `micromark` version `3` and later.

## Security

This package is safe.

## Related

* [`micromark-extension-mdxjs`][github-micromark-extension-mdxjs]
  — support all MDX syntax
* [`mdast-util-mdx-jsx`][github-mdast-util-mdx-jsx]
  — support MDX JSX in mdast
* [`remark-mdx`][mdxjs-remark-mdx]
  — support all MDX syntax in remark

## Contribute

See [`contributing.md` in `micromark/.github`][health-contributing] for ways
to get started.
See [`support.md`][health-support] for ways to get help.

This project has a [code of conduct][health-coc].
By interacting with this repository,
organization,
or community you agree to abide by its terms.

## License

[MIT][file-license] © [Titus Wormer][wooorm]

<!-- Definitions -->

[api-mdx-jsx]: #mdxjsxoptions

[api-options]: #options

[badge-build-image]: https://github.com/micromark/micromark-extension-mdx-jsx/workflows/main/badge.svg

[badge-build-url]: https://github.com/micromark/micromark-extension-mdx-jsx/actions

[badge-coverage-image]: https://img.shields.io/codecov/c/github/micromark/micromark-extension-mdx-jsx.svg

[badge-coverage-url]: https://codecov.io/github/micromark/micromark-extension-mdx-jsx

[badge-downloads-image]: https://img.shields.io/npm/dm/micromark-extension-mdx-jsx.svg

[badge-downloads-url]: https://www.npmjs.com/package/micromark-extension-mdx-jsx

[badge-size-image]: https://img.shields.io/bundlejs/size/micromark-extension-mdx-jsx

[badge-size-url]: https://bundlejs.com/?q=micromark-extension-mdx-jsx

[esmsh]: https://esm.sh

[file-license]: license

[github-acorn]: https://github.com/acornjs/acorn

[github-acorn-options]: https://github.com/acornjs/acorn/blob/96c721dbf89d0ccc3a8c7f39e69ef2a6a3c04dfa/acorn/dist/acorn.d.ts#L16

[github-expression-syntax]: https://github.com/micromark/micromark-extension-mdx-expression/blob/main/packages/micromark-extension-mdx-expression/readme.md#syntax

[github-gist-esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[github-mdast-util-from-markdown]: https://github.com/syntax-tree/mdast-util-from-markdown

[github-mdast-util-mdx-jsx]: https://github.com/syntax-tree/mdast-util-mdx-jsx

[github-micromark]: https://github.com/micromark/micromark

[github-micromark-expression]: https://github.com/micromark/micromark-extension-mdx-expression

[github-micromark-extension]: https://github.com/micromark/micromark#syntaxextension

[github-micromark-extension-mdxjs]: https://github.com/micromark/micromark-extension-mdxjs

[health-coc]: https://github.com/micromark/.github/blob/main/code-of-conduct.md

[health-contributing]: https://github.com/micromark/.github/blob/main/contributing.md

[health-support]: https://github.com/micromark/.github/blob/main/support.md

[mdxjs]: https://mdxjs.com

[mdxjs-interleaving]: https://mdxjs.com/docs/what-is-mdx/#interleaving

[mdxjs-remark-mdx]: https://mdxjs.com/packages/remark-mdx/

[nodejs-api-conditions]: https://nodejs.org/api/packages.html#packages_resolving_user_conditions

[npmjs-install]: https://docs.npmjs.com/cli/install

[typescript]: https://www.typescriptlang.org

[wooorm]: https://wooorm.com
