import { convertEmojiSequenceToUTF16, convertEmojiSequenceToUTF32 } from "./convert.js";

const defaultUnicodeOptions = {
	prefix: "",
	separator: "",
	case: "lower",
	format: "utf-32",
	add0: false,
	throwOnError: true
};
/**
* Convert number to string
*/
function convert(sequence, options) {
	const prefix = options.prefix;
	const func = options.case === "upper" ? "toUpperCase" : "toLowerCase";
	const cleanSequence = options.format === "utf-16" ? convertEmojiSequenceToUTF16(sequence) : convertEmojiSequenceToUTF32(sequence, options.throwOnError);
	return cleanSequence.map((code) => {
		let str = code.toString(16);
		if (options.add0 && str.length < 4) str = "0".repeat(4 - str.length) + str;
		return prefix + str[func]();
	}).join(options.separator);
}
/**
* Convert unicode number to string
*
* Example:
* 	0x1F600 => '1F600'
*/
function getEmojiUnicodeString(code, options = {}) {
	return convert([code], {
		...defaultUnicodeOptions,
		...options
	});
}
const defaultSequenceOptions = {
	...defaultUnicodeOptions,
	separator: "-"
};
/**
* Convert unicode numbers sequence to string
*
* Example:
* 	[0x1f441, 0xfe0f] => '1f441-fe0f'
*/
function getEmojiSequenceString(sequence, options = {}) {
	return convert(sequence, {
		...defaultSequenceOptions,
		...options
	});
}
/**
* Convert unicode numbers sequence to string
*
* Simple version of `getEmojiSequenceString()` without options that otherwise add to bundle
*/
function getEmojiSequenceKeyword(sequence) {
	return sequence.map((code) => code.toString(16)).join("-");
}

export { getEmojiSequenceKeyword, getEmojiSequenceString, getEmojiUnicodeString };