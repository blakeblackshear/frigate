'use strict';

/**
This regex represents a loose rule of an “image candidate string”.

@see https://html.spec.whatwg.org/multipage/images.html#srcset-attribute

An “image candidate string” roughly consists of the following:
1. Zero or more whitespace characters.
2. A non-empty URL that does not start or end with `,`.
3. Zero or more whitespace characters.
4. An optional “descriptor” that starts with a whitespace character.
5. Zero or more whitespace characters.
6. Each image candidate string is separated by a `,`.

We intentionally implement a loose rule here so that we can perform more aggressive error handling and reporting in the below code.
*/
const imageCandidateRegex = /\s*([^,]\S*[^,](?:\s+[^,]+)?)\s*(?:,|$)/;

const duplicateDescriptorCheck = (allDescriptors, value, postfix) => {
	allDescriptors[postfix] = allDescriptors[postfix] || {};
	if (allDescriptors[postfix][value]) {
		throw new Error(`No more than one image candidate is allowed for a given descriptor: ${value}${postfix}`);
	}

	allDescriptors[postfix][value] = true;
};

const fallbackDescriptorDuplicateCheck = allDescriptors => {
	if (allDescriptors.fallback) {
		throw new Error('Only one fallback image candidate is allowed');
	}

	if (allDescriptors.x['1']) {
		throw new Error('A fallback image is equivalent to a 1x descriptor, providing both is invalid.');
	}

	allDescriptors.fallback = true;
};

const descriptorCountCheck = (allDescriptors, currentDescriptors) => {
	if (currentDescriptors.length === 0) {
		fallbackDescriptorDuplicateCheck(allDescriptors);
	} else if (currentDescriptors.length > 1) {
		throw new Error(`Image candidate may have no more than one descriptor, found ${currentDescriptors.length}: ${currentDescriptors.join(' ')}`);
	}
};

const validDescriptorCheck = (value, postfix, descriptor) => {
	if (Number.isNaN(value)) {
		throw new TypeError(`${descriptor || value} is not a valid number`);
	}

	switch (postfix) {
		case 'w': {
			if (value <= 0) {
				throw new Error('Width descriptor must be greater than zero');
			} else if (!Number.isInteger(value)) {
				throw new TypeError('Width descriptor must be an integer');
			}

			break;
		}

		case 'x': {
			if (value <= 0) {
				throw new Error('Pixel density descriptor must be greater than zero');
			}

			break;
		}

		case 'h': {
			throw new Error('Height descriptor is no longer allowed');
		}

		default: {
			throw new Error(`Invalid srcset descriptor: ${descriptor}`);
		}
	}
};

exports.parse = (string, {strict = false} = {}) => {
	const allDescriptors = strict ? {} : undefined;
	return string.split(imageCandidateRegex)
		.filter((part, index) => index % 2 === 1)
		.map(part => {
			const [url, ...descriptors] = part.trim().split(/\s+/);

			const result = {url};

			if (strict) {
				descriptorCountCheck(allDescriptors, descriptors);
			}

			for (const descriptor of descriptors) {
				const postfix = descriptor[descriptor.length - 1];
				const value = Number.parseFloat(descriptor.slice(0, -1));

				if (strict) {
					validDescriptorCheck(value, postfix, descriptor);
					duplicateDescriptorCheck(allDescriptors, value, postfix);
				}

				switch (postfix) {
					case 'w': {
						result.width = value;
						break;
					}

					case 'h': {
						result.height = value;
						break;
					}

					case 'x': {
						result.density = value;
						break;
					}

					// No default
				}
			}

			return result;
		});
};

const knownDescriptors = new Set(['width', 'height', 'density']);

exports.stringify = (array, {strict = false} = {}) => {
	const allDescriptors = strict ? {} : null;
	return array.map(element => {
		if (!element.url) {
			if (strict) {
				throw new Error('URL is required');
			}

			return '';
		}

		const descriptorKeys = Object.keys(element).filter(key => knownDescriptors.has(key));

		if (strict) {
			descriptorCountCheck(allDescriptors, descriptorKeys);
		}

		const result = [element.url];

		for (const descriptorKey of descriptorKeys) {
			const value = element[descriptorKey];
			let postfix;
			switch (descriptorKey) {
				case 'width': {
					postfix = 'w';

					break;
				}

				case 'height': {
					postfix = 'h';

					break;
				}

				case 'density': {
					postfix = 'x';

					break;
				}
			// No default
			}

			const descriptor = `${value}${postfix}`;

			if (strict) {
				validDescriptorCheck(value, postfix);
				duplicateDescriptorCheck(allDescriptors, value, postfix);
			}

			result.push(descriptor);
		}

		return result.join(' ');
	}).join(', ');
};
