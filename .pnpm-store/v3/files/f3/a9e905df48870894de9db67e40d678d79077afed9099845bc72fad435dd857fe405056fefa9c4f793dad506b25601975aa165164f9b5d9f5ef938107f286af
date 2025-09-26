import {htmlEscape} from 'escape-goat';

export class MissingValueError extends Error {
	constructor(key) {
		super(`Missing a value for ${key ? `the placeholder: ${key}` : 'a placeholder'}`, key);
		this.name = 'MissingValueError';
		this.key = key;
	}
}

export class MissingFilterError extends Error {
	constructor(filterName) {
		super(`Missing filter: ${filterName}`);
		this.name = 'MissingFilterError';
		this.filterName = filterName;
	}
}

export default function pupa(template, data, {ignoreMissing = false, transform = ({value}) => value, filters = {}} = {}) {
	if (typeof template !== 'string') {
		throw new TypeError(`Expected a \`string\` in the first argument, got \`${typeof template}\``);
	}

	if (typeof data !== 'object') {
		throw new TypeError(`Expected an \`object\` or \`Array\` in the second argument, got \`${typeof data}\``);
	}

	// Handle escape sequences for literal braces
	const escapedLeftBrace = '\uE000\uE001\uE002'; // Private use characters as temporary marker
	const escapedRightBrace = '\uE003\uE004\uE005'; // Private use characters as temporary marker

	template = template.replace(/\\{/g, escapedLeftBrace);
	template = template.replace(/\\}/g, escapedRightBrace);

	const parseKeyPath = key => {
		const segments = [];
		let segment = '';

		for (let index = 0; index < key.length; index++) {
			if (key[index] === '\\' && key[index + 1] === '.') {
				segment += '.';
				index++; // Skip escaped dot
			} else if (key[index] === '.') {
				segments.push(segment);
				segment = '';
			} else {
				segment += key[index];
			}
		}

		segments.push(segment);
		return segments;
	};

	const replace = (placeholder, keyWithFilters) => {
		// Parse filters from the key (e.g., "name | capitalize | upper")
		const parts = keyWithFilters.split('|').map(part => part.trim());
		const key = parts[0];
		const filterChain = parts.slice(1);

		// Navigate object path
		const segments = parseKeyPath(key);
		let value = data;
		for (const property of segments) {
			/// value = value?.[property];

			if (value) {
				value = value[property];
			}
		}

		// Apply filters
		for (const filterName of filterChain) {
			const filter = filters[filterName];

			if (!filter) {
				if (ignoreMissing) {
					return placeholder;
				}

				throw new MissingFilterError(filterName);
			}

			if (value !== undefined) {
				value = filter(value);
			}
		}

		const transformedValue = transform({value, key});
		if (transformedValue === undefined) {
			if (ignoreMissing) {
				return placeholder;
			}

			throw new MissingValueError(key);
		}

		return String(transformedValue);
	};

	// ReDoS-safe regex to capture keys with optional filters
	// Matches: {key} or {key | filter} or {key | filter1 | filter2}
	const keyPattern = '(\\d+|[a-z$_][\\w\\-.$\\\\]*)';
	const filterPattern = '(?:\\|\\s*[a-z$_][\\w$]*\\s*)*';
	const keyWithFiltersPattern = `(${keyPattern}\\s*${filterPattern})`;

	const doubleBraceRegex = new RegExp(`{{${keyWithFiltersPattern}}}`, 'gi');
	const singleBraceRegex = new RegExp(`{${keyWithFiltersPattern}}`, 'gi');

	template = template.replace(doubleBraceRegex, (...arguments_) => htmlEscape(replace(...arguments_)));

	template = template.replace(singleBraceRegex, replace);

	// Replace temporary markers with literal braces
	template = template.replace(new RegExp(escapedLeftBrace, 'g'), '{');
	template = template.replace(new RegExp(escapedRightBrace, 'g'), '}');

	return template;
}
