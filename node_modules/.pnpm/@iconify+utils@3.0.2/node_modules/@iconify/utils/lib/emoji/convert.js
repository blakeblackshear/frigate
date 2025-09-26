import { endUTF32Pair, minUTF32, startUTF32Pair1, startUTF32Pair2 } from "./data.js";

/**
* Convert string to number
*/
function getEmojiCodePoint(code) {
	return parseInt(code, 16);
}
/**
* First part of UTF-32 to UTF-16
*/
function utf32FirstNum(code) {
	return (code - minUTF32 >> 10 | 0) + startUTF32Pair1;
}
/**
* First part of UTF-32 to UTF-16
*/
function utf32SecondNum(code) {
	return (code - minUTF32 & 1023) + startUTF32Pair2;
}
/**
* Get UTF-32 as UTF-16 sequence
*/
function splitUTF32Number(code) {
	if (code >= minUTF32) return [utf32FirstNum(code), utf32SecondNum(code)];
}
/**
* Check if number is UTF-32 split as UTF-16
*
* Returns:
* - 1 if number fits first number in sequence
* - 2 if number fits second number in sequence
* - false on failure
*/
function isUTF32SplitNumber(value) {
	if (value >= startUTF32Pair1) {
		if (value < startUTF32Pair2) return 1;
		if (value < endUTF32Pair) return 2;
	}
	return false;
}
/**
* Get UTF-16 sequence as UTF-32
*/
function mergeUTF32Numbers(part1, part2) {
	if (part1 < startUTF32Pair1 || part1 >= startUTF32Pair2 || part2 < startUTF32Pair2 || part2 >= endUTF32Pair) return;
	return (part1 - startUTF32Pair1 << 10) + (part2 - startUTF32Pair2) + minUTF32;
}
/**
* Convert hexadecimal string or number to unicode
*/
function getEmojiUnicode(code) {
	return String.fromCodePoint(typeof code === "number" ? code : getEmojiCodePoint(code));
}
/**
* Convert sequence to UTF-16
*/
function convertEmojiSequenceToUTF16(numbers) {
	const results = [];
	for (let i = 0; i < numbers.length; i++) {
		const code = numbers[i];
		if (code >= minUTF32) {
			results.push(utf32FirstNum(code));
			results.push(utf32SecondNum(code));
		} else results.push(code);
	}
	return results;
}
/**
* Convert sequence to UTF-32
*/
function convertEmojiSequenceToUTF32(numbers, throwOnError = true) {
	const results = [];
	for (let i = 0; i < numbers.length; i++) {
		const code = numbers[i];
		if (code >= minUTF32) {
			results.push(code);
			continue;
		}
		const part = isUTF32SplitNumber(code);
		if (!part) {
			results.push(code);
			continue;
		}
		if (part === 1 && numbers.length > i + 1) {
			const merged = mergeUTF32Numbers(code, numbers[i + 1]);
			if (merged) {
				i++;
				results.push(merged);
				continue;
			}
		}
		if (throwOnError) {
			const nextCode = numbers[i + 1];
			throw new Error(`Invalid UTF-16 sequence: ${code.toString(16)}-${nextCode ? nextCode.toString(16) : "undefined"}`);
		}
		results.push(code);
	}
	return results;
}

export { convertEmojiSequenceToUTF16, convertEmojiSequenceToUTF32, getEmojiCodePoint, getEmojiUnicode, isUTF32SplitNumber, mergeUTF32Numbers, splitUTF32Number };