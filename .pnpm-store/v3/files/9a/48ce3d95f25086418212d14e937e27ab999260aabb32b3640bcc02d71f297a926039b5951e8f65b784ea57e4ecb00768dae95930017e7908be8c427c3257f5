# pupa

> Simple micro templating

Useful when all you need is to fill in some placeholders.

## Install

```sh
npm install pupa
```

## Usage

```js
import pupa from 'pupa';

pupa('The mobile number of {name} is {phone.mobile}', {
	name: 'Sindre',
	phone: {
		mobile: '609 24 363'
	}
});
//=> 'The mobile number of Sindre is 609 24 363'

pupa('I like {0} and {1}', ['🦄', '🐮']);
//=> 'I like 🦄 and 🐮'

// Double braces encodes the HTML entities to avoid code injection.
pupa('I like {{0}} and {{1}}', ['<br>🦄</br>', '<i>🐮</i>']);
//=> 'I like &lt;br&gt;🦄&lt;/br&gt; and &lt;i&gt;🐮&lt;/i&gt;'

// Escaped dots in property names
pupa('The version is {package\\.version}', {
	'package.version': '1.0.0'
});
//=> 'The version is 1.0.0'

// Escape literal braces
pupa('Use \\{key\\} syntax for placeholders', {});
//=> 'Use {key} syntax for placeholders'

pupa('Hi {name}! Use \\{key\\} for placeholders', {name: 'John'});
//=> 'Hi John! Use {key} for placeholders'
```

Note: It does not support nesting placeholders: `pupa('{phone.{type}}', …)`

## API

### pupa(template, data, options?)

#### template

Type: `string`

Text with placeholders for `data` properties. Supports filter syntax: `{key | filter1 | filter2}`.

Use `\{` and `\}` to include literal braces in the output.

#### data

Type: `object | unknown[]`

Data to interpolate into `template`.

The keys should be a valid JS identifier or number (`a-z`, `A-Z`, `0-9`).

You can escape dots in placeholder keys with backslashes (e.g., `{foo\\.bar}` accesses the property `'foo.bar'` instead of `foo.bar`).

#### options

Type: `object`

##### ignoreMissing

Type: `boolean`\
Default: `false`

By default, throws a `MissingValueError` when a placeholder resolves to `undefined`. When `true`, ignores missing values and leaves the placeholder as-is.

##### transform

Type: `function` (default: `({value}) => value`)

Transform function called for each interpolation. If it returns `undefined`, behavior depends on the `ignoreMissing` option. Otherwise, the returned value is converted to a string (and HTML-escaped when using double braces).

##### filters

Type: `object`\
Default: `{}`

Filters to apply to values.

Filters can be chained using the pipe syntax: `{name | uppercase | reverse}`.

```js
import pupa from 'pupa';

const filters = {
	trim: value => value.trim(),
	uppercase: value => value.toUpperCase()
};

pupa('{name | trim | uppercase}', {name: 'john '}, {filters});
//=> 'JOHN'
```

### MissingValueError

Exposed for instance checking.

### MissingFilterError

Exposed for instance checking.

Thrown when a filter is used that doesn't exist in the `filters` option.

## FAQ

### What about template literals?

Template literals are evaluated when the code runs. This module evaluates templates when you call it, which is useful when templates or data are created dynamically or come from user input.

### Will filters support parameters?

No. Filters are simple functions that take a single value and return a transformed value. For complex transformations requiring parameters, use the `transform` option instead.

### Are there built-in filters?

No. This keeps the package minimal and focused. You can easily define your own filters.

## Related

- [pupa-cli](https://github.com/sindresorhus/pupa-cli) - CLI for this module
