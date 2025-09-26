export class MissingValueError extends Error {
	name: 'MissingValueError';
	message: string;
	key: string;
	constructor(key: string);
}

export class MissingFilterError extends Error {
	name: 'MissingFilterError';
	message: string;
	filterName: string;
	constructor(filterName: string);
}

export type Options = {
	/**
	By default, throws a `MissingValueError` when a placeholder resolves to `undefined`. When `true`, ignores missing values and leaves the placeholder as-is.

	@default false
	*/
	ignoreMissing?: boolean;

	/**
	Transform function called for each interpolation.

	@default ({value}) => value

	If it returns `undefined`, behavior depends on the `ignoreMissing` option. Otherwise, the returned value is converted to a string (and HTML-escaped when using double braces).
	*/
	transform?: (data: {value: unknown; key: string}) => unknown;

	/**
	Filters to apply to values.

	Filters can be chained using the pipe syntax: `{name | uppercase | reverse}`.

	@default {}

	@example
	```
	import pupa from 'pupa';

	const filters = {
		trim: value => value.trim(),
		uppercase: value => value.toUpperCase()
	};

	pupa('{name | trim | uppercase}', {name: 'john '}, {filters});
	//=> 'JOHN'
	```
	*/
	filters?: Record<string, (value: unknown) => unknown>;
};

/**
Simple micro templating.

@param template - Text with placeholders for `data` properties. Supports filter syntax: `{key | filter1 | filter2}`. Use `\{` and `\}` to include literal braces in the output.
@param data - Data to interpolate into `template`. The keys should be a valid JS identifier or number (`a-z`, `A-Z`, `0-9`). You can escape dots in placeholder keys with backslashes (e.g., `{foo\\.bar}` accesses the property `'foo.bar'` instead of `foo.bar`).

@example
```
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
*/
export default function pupa(
	template: string,
	data: unknown[] | Record<string, any>,
	options?: Options
): string;
