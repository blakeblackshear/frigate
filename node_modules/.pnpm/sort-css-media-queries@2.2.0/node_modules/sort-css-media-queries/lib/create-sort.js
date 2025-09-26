// ----------------------------------------
// Private
// ----------------------------------------

const minMaxWidth =
	/(!?\(\s*min(-device)?-width)(.|\n)+\(\s*max(-device)?-width|\(\s*width\s*>(=)?(.|\n)+\(\s*width\s*<(=)?|(!?\(.*<(=)?\s*width\s*<(=)?)/i;
const minWidth = /\(\s*min(-device)?-width|\(\s*width\s*>(=)?/i;
const maxMinWidth =
	/(!?\(\s*max(-device)?-width)(.|\n)+\(\s*min(-device)?-width|\(\s*width\s*<(=)?(.|\n)+\(\s*width\s*>(=)?|(!?\(.*>(=)?\s*width\s*>(=)?)/i;
const maxWidth = /\(\s*max(-device)?-width|\(\s*width\s*<(=)?/i;

const isMinWidth = _testQuery(minMaxWidth, maxMinWidth, minWidth);
const isMaxWidth = _testQuery(maxMinWidth, minMaxWidth, maxWidth);

const minMaxHeight =
	/(!?\(\s*min(-device)?-height)(.|\n)+\(\s*max(-device)?-height|\(\s*height\s*>(=)?(.|\n)+\(\s*height\s*<(=)?|(!?\(.*<(=)?\s*height\s*<(=)?)/i;
const minHeight = /\(\s*min(-device)?-height|\(\s*height\s*>(=)?/i;
const maxMinHeight =
	/(!?\(\s*max(-device)?-height)(.|\n)+\(\s*min(-device)?-height|\(\s*height\s*<(=)?(.|\n)+\(\s*height\s*>(=)?|(!?\(.*>(=)?\s*height\s*>(=)?)/i;
const maxHeight = /\(\s*max(-device)?-height|\(\s*height\s*<(=)?/i;

const isMinHeight = _testQuery(minMaxHeight, maxMinHeight, minHeight);
const isMaxHeight = _testQuery(maxMinHeight, minMaxHeight, maxHeight);

const isPrint = /print/i;
const isPrintOnly = /^print$/i;

const maxValue = Number.MAX_VALUE;

/**
 * Obtain the length of the media request in pixels.
 * Copy from original source `function inspectLength (length)`
 * {@link https://github.com/hail2u/node-css-mqpacker/blob/master/index.js#L58}
 * @private
 * @param {string} length
 * @return {number}
 */
function _getQueryLength(query) {
	let length = /(-?\d*\.?\d+)(ch|em|ex|px|rem)/.exec(query);

	if (length === null && (isMinWidth(query) || isMinHeight(query))) {
		length = /(\d)/.exec(query);
	}

	if (length === '0') {
		return 0;
	}

	if (length === null) {
		return maxValue;
	}

	let number = length[1];
	const unit = length[2];

	switch (unit) {
		case 'ch':
			number = parseFloat(number) * 8.8984375;
			break;

		case 'em':
		case 'rem':
			number = parseFloat(number) * 16;
			break;

		case 'ex':
			number = parseFloat(number) * 8.296875;
			break;

		case 'px':
			number = parseFloat(number);
			break;
	}

	return +number;
}

/**
 * Wrapper for creating test functions
 * @private
 * @param {RegExp} doubleTestTrue
 * @param {RegExp} doubleTestFalse
 * @param {RegExp} singleTest
 * @return {Function}
 */
function _testQuery(doubleTestTrue, doubleTestFalse, singleTest) {
	/**
	 * @param {string} query
	 * @return {boolean}
	 */
	return function (query) {
		if (doubleTestTrue.test(query)) {
			return true;
		} else if (doubleTestFalse.test(query)) {
			return false;
		}
		return singleTest.test(query);
	};
}

/**
 * @private
 * @param {string} a
 * @param {string} b
 * @return {number|null}
 */
function _testIsPrint(a, b) {
	const isPrintA = isPrint.test(a);
	const isPrintOnlyA = isPrintOnly.test(a);

	const isPrintB = isPrint.test(b);
	const isPrintOnlyB = isPrintOnly.test(b);

	if (isPrintA && isPrintB) {
		if (!isPrintOnlyA && isPrintOnlyB) {
			return 1;
		}
		if (isPrintOnlyA && !isPrintOnlyB) {
			return -1;
		}
		return a.localeCompare(b);
	}
	if (isPrintA) {
		return 1;
	}
	if (isPrintB) {
		return -1;
	}

	return null;
}

// ----------------------------------------
// Public
// ----------------------------------------

/**
 * @param {Object} [configuration]
 * @param {boolean} [configuration.unitlessMqAlwaysFirst]
 * @returns {(function(string, string): number)|*}
 */
module.exports = function createSort(configuration) {
	const config = configuration || {};
	const UNITLESS_MQ_ALWAYS_FIRST = config.unitlessMqAlwaysFirst;

	/**
	 * Sorting an array with media queries
	 * according to the mobile-first methodology.
	 * @param {string} a
	 * @param {string} b
	 * @return {number} 1 / 0 / -1
	 */
	function sortCSSmq(a, b) {
		const testIsPrint = _testIsPrint(a, b);
		if (testIsPrint !== null) {
			return testIsPrint;
		}

		const minA = isMinWidth(a) || isMinHeight(a);
		const maxA = isMaxWidth(a) || isMaxHeight(a);

		const minB = isMinWidth(b) || isMinHeight(b);
		const maxB = isMaxWidth(b) || isMaxHeight(b);

		if (UNITLESS_MQ_ALWAYS_FIRST && ((!minA && !maxA) || (!minB && !maxB))) {
			if (!minA && !maxA && !minB && !maxB) {
				return a.localeCompare(b);
			}
			return !minB && !maxB ? 1 : -1;
		} else {
			if (minA && maxB) {
				return -1;
			}
			if (maxA && minB) {
				return 1;
			}

			const lengthA = _getQueryLength(a);
			const lengthB = _getQueryLength(b);

			if (lengthA === maxValue && lengthB === maxValue) {
				return a.localeCompare(b);
			} else if (lengthA === maxValue) {
				return 1;
			} else if (lengthB === maxValue) {
				return -1;
			}

			if (lengthA > lengthB) {
				if (maxA) {
					return -1;
				}
				return 1;
			}

			if (lengthA < lengthB) {
				if (maxA) {
					return 1;
				}
				return -1;
			}

			return a.localeCompare(b);
		}
	}

	/**
	 * Sorting an array with media queries
	 * according to the desktop-first methodology.
	 * @param {string} a
	 * @param {string} b
	 * @return {number} 1 / 0 / -1
	 */
	sortCSSmq.desktopFirst = function (a, b) {
		const testIsPrint = _testIsPrint(a, b);
		if (testIsPrint !== null) {
			return testIsPrint;
		}

		const minA = isMinWidth(a) || isMinHeight(a);
		const maxA = isMaxWidth(a) || isMaxHeight(a);

		const minB = isMinWidth(b) || isMinHeight(b);
		const maxB = isMaxWidth(b) || isMaxHeight(b);

		if (UNITLESS_MQ_ALWAYS_FIRST && ((!minA && !maxA) || (!minB && !maxB))) {
			if (!minA && !maxA && !minB && !maxB) {
				return a.localeCompare(b);
			}
			return !minB && !maxB ? 1 : -1;
		} else {
			if (minA && maxB) {
				return 1;
			}
			if (maxA && minB) {
				return -1;
			}

			const lengthA = _getQueryLength(a);
			const lengthB = _getQueryLength(b);

			if (lengthA === maxValue && lengthB === maxValue) {
				return a.localeCompare(b);
			} else if (lengthA === maxValue) {
				return 1;
			} else if (lengthB === maxValue) {
				return -1;
			}

			if (lengthA > lengthB) {
				if (maxA) {
					return -1;
				}
				return 1;
			}

			if (lengthA < lengthB) {
				if (maxA) {
					return 1;
				}
				return -1;
			}

			return -a.localeCompare(b);
		}
	};

	return sortCSSmq;
};
