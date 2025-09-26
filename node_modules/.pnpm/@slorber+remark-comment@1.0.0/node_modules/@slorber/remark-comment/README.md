# remark-comment

Parse HTML style comments as a different node type so it can be ignored during
serialization.

## Install and usage

```sh
npm install remark-comment
```

```js
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkComment from 'remark-comment'

unified().use(remarkParse).use(remarkComment)
```

For more help with unified, please see the docs for [unified] and [remark].

This package also exports its [micromark] and [mdast] plugins:

```js
import {
  comment,
  commentHtml,
  commentFromMarkdown,
  commentToMarkdown,
} from 'remark-comment'
```

**Options:**

The `remarkComment` and `commentFromMarkdown` functions take the options:

- `ast`: If true, a `{ type: "comment" }` node will be included in the
  resulting AST. This is useful if you want to do post-processing and stringify
  back to markdown. Default: `false`.

[unified]: https://unifiedjs.com/learn/guide/using-unified/
[remark]: https://unifiedjs.com/explore/package/remark-parse/
[micromark]: https://github.com/micromark/micromark
[mdast]: https://github.com/syntax-tree/mdast#extensions

## Example

```markdown
# This file

<!-- contains a comment -->

And a paragraph
```

Renders to:

```html
<h1>This file</h1>
<p>And a paragraph</p>
```

## Motivation

This package was created after realizing that MDX lacked support for HTML style
comments. When trying to migrate an existing collection of markdown files to
MDX, hitting syntax errors for HTML comments was a non-starter. Rather than go
modify all those files to use a (more awkward) JSX expression comment, I created
this plugin to add back this support.

However, I found this useful when used outside of MDX. Common markdown
interprets an HTML comment as an HTML block, and during serialization will pass
it directly through to the final HTML document. I typically do not want my
markdown comments appearing in my final HTML documents, and this plugin achieves
this effect.

## Caveats

This plugin must be added after MDX, otherwise you will see this error:

```
Unexpected character `!` (U+0021) before name, expected a character that can start a name, such as a letter, `$`, or `_` (note: to create a comment in MDX, use `{/* text */}`)
```

In a unified pipeline:

```js
unified().use(remarkMDX).use(remarkComment)
```

Unlike HTML, comments cannot be used within a JSX body. JSX is still JSX.
HTML comments must appear outside of JSX, use JSX style comments (`{/* comment */}`) inside of JSX.
