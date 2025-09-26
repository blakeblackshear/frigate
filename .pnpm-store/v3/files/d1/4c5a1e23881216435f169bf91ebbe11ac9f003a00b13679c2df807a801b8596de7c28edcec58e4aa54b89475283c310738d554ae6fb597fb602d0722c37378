# srcset

> Parse and stringify the HTML `<img>` [srcset](https://www.smashingmagazine.com/2013/08/webkit-implements-srcset-and-why-its-a-good-thing/) attribute.

Can be useful if you're creating a build-tool.

## Install

```
$ npm install srcset
```

## Usage

How an image with `srcset` might look like:

```html
<img
	alt="The Breakfast Combo"
	src="banner.jpg"
	srcset="banner-HD.jpg 2x, banner-phone.jpg 100w"
>
```

Then have some fun with it:

```js
const srcset = require('srcset');

const parsed = srcset.parse('banner-HD.jpg 2x, banner-phone.jpg 100w');
console.log(parsed);
/*
[
	{
		url: 'banner-HD.jpg',
		density: 2
	},
	{
		url: 'banner-phone.jpg',
		width: 100
	}
]
*/

parsed.push({
	url: 'banner-super-HD.jpg',
	density: 3
});

const stringified = srcset.stringify(parsed);
console.log(stringified);
/*
banner-HD.jpg 2x, banner-phone.jpg 100w, banner-super-HD.jpg 3x
*/
```

## API

### .parse(string, options?)

Parse the HTML `<img>` [srcset](http://mobile.smashingmagazine.com/2013/08/21/webkit-implements-srcset-and-why-its-a-good-thing/) attribute.

Accepts a “srcset” string and returns an array of objects with the possible properties: `url` (always), `width`, `height`, and `density`.

#### string

Type: `string`

A “srcset” string.

#### options

Type: `object`

##### strict

Type: `boolean`\
Default: `false`

When enabled, an invalid “srcset” string will cause an error to be thrown. When disabled, a best effort will be made to parse the string, potentially resulting in invalid or nonsensical output.

### .stringify(SrcSetDefinitions, options?)

Stringify `SrcSetDefinition`s. Accepts an array of `SrcSetDefinition` objects and returns a “srcset” string.

#### srcsetDescriptors

Type: `array`

An array of `SrcSetDefinition` objects. Each object should have a `url` field and may have `width`, `height` or `density` fields. When the `strict` option is `true`, only `width` or `density` is accepted.

#### options

Type: `object`

##### strict

Type: `boolean`

Default: `false`

Enable or disable validation of the SrcSetDefinitions. When true, invalid input will cause an error to be thrown. When false, a best effort will be made to stringify invalid input, likely resulting in invalid srcset value.

---

<div align="center">
	<b>
		<a href="https://tidelift.com/subscription/pkg/npm-srcset?utm_source=npm-srcset&utm_medium=referral&utm_campaign=readme">Get professional support for this package with a Tidelift subscription</a>
	</b>
	<br>
	<sub>
		Tidelift helps make open source sustainable for maintainers while giving companies<br>assurances about security, maintenance, and licensing for their dependencies.
	</sub>
</div>
