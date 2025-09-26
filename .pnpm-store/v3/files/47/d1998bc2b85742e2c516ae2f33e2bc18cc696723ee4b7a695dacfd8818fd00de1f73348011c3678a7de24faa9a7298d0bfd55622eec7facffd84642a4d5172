import { joinerEmoji, vs16Emoji } from "./data.js";
import { getEmojiCodePoint } from "./convert.js";

/**
* Get emoji sequence from string
*
* Examples (shows same emoji sequence formatted differently):
*  '1F441 FE0F 200D 1F5E8 FE0F' => [0x1f441, 0xfe0f, 0x200d, 0x1f5e8, 0xfe0f]
*  '1f441-fe0f-200d-1f5e8-fe0f' => [0x1f441, 0xfe0f, 0x200d, 0x1f5e8, 0xfe0f]
*  '\\uD83D\\uDC41\\uFE0F\\u200D\\uD83D\\uDDE8\\uFE0F' => [0x1f441, 0xfe0f, 0x200d, 0x1f5e8, 0xfe0f]
*/
function getEmojiSequenceFromString(value) {
	return value.trim().split(/[^0-9A-F]+/i).filter((item) => item.length > 0).map(getEmojiCodePoint);
}
/**
* Convert emoji sequence or keyword
*
* If sequence is characters list, like '1f441-fe0f', it will be converted to [0x1f441, 0xfe0f]
* If sequence contains anything other than [0-9A-F-\s], it will be converted character by character
*
* This is used to treat keywords, like ':cat:' differently when converting strings to sequences
*/
function getSequenceFromEmojiStringOrKeyword(value) {
	if (!value.match(/^[0-9a-fA-F-\s]+$/)) {
		const results = [];
		for (const codePoint of value) {
			const code = codePoint.codePointAt(0);
			if (code) results.push(code);
			else return getEmojiSequenceFromString(value);
		}
		return results;
	}
	return getEmojiSequenceFromString(value);
}
/**
* Split emoji sequence by joiner
*
* Result represents one emoji, split in smaller sequences separated by 0x200D
*
* Example:
* 	[0x1FAF1, 0x1F3FB, 0x200D, 0x1FAF2, 0x1F3FC] => [[0x1FAF1, 0x1F3FB], [0x1FAF2, 0x1F3FC]]
*/
function splitEmojiSequences(sequence, separator = joinerEmoji) {
	const results = [];
	let queue = [];
	for (let i = 0; i < sequence.length; i++) {
		const code = sequence[i];
		if (code === separator) {
			results.push(queue);
			queue = [];
		} else queue.push(code);
	}
	results.push(queue);
	return results;
}
/**
* Join emoji sequences
*
* Parameter represents one emoji, split in smaller sequences
*
* Example:
* 	[[0x1FAF1, 0x1F3FB], [0x1FAF2, 0x1F3FC]] => [0x1FAF1, 0x1F3FB, 0x200D, 0x1FAF2, 0x1F3FC]
*/
function joinEmojiSequences(sequences, separator = joinerEmoji) {
	let results = [];
	for (let i = 0; i < sequences.length; i++) {
		if (i > 0) results.push(separator);
		results = results.concat(sequences[i]);
	}
	return results;
}
/**
* Get unqualified sequence
*/
function getUnqualifiedEmojiSequence(sequence) {
	return sequence.filter((num) => num !== vs16Emoji);
}

export { getEmojiSequenceFromString, getSequenceFromEmojiStringOrKeyword, getUnqualifiedEmojiSequence, joinEmojiSequences, splitEmojiSequences };