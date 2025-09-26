import { emojiComponents, keycapEmoji, vs16Emoji } from "../data.js";
import { convertEmojiSequenceToUTF32 } from "../convert.js";
import { getUnqualifiedEmojiSequence, joinEmojiSequences, splitEmojiSequences } from "../cleanup.js";
import { getEmojiSequenceKeyword } from "../format.js";

/**
* Get qualified sequence, adding optional `FE0F` wherever it might exist
*
* This might result in sequence that is not actually valid, but considering
* that `FE0F` is always treated as optional, full sequence used in regex will
* catch both qualified and unqualified emojis, so proper sequence will get
* caught anyway. This function just makes sure that in case if sequence does
* have `FE0F`, it will be caught by regex too.
*/
function guessQualifiedEmojiSequence(sequence) {
	const split = splitEmojiSequences(sequence).map((part) => {
		if (part.indexOf(vs16Emoji) !== -1) return part;
		if (part.length === 2) {
			const lastNum = part[1];
			if (lastNum === keycapEmoji) return [
				part[0],
				vs16Emoji,
				lastNum
			];
			for (const key in emojiComponents) {
				const range = emojiComponents[key];
				if (lastNum >= range[0] && lastNum < range[1]) return [
					part[0],
					vs16Emoji,
					lastNum
				];
			}
		}
		return part.length === 1 ? [part[0], vs16Emoji] : part;
	});
	return joinEmojiSequences(split);
}
/**
* Get qualified variations for emojis
*
* Also converts list to UTF-32 as needed and removes duplicate items
*/
function getQualifiedEmojiVariation(item) {
	const unqualifiedSequence = getUnqualifiedEmojiSequence(convertEmojiSequenceToUTF32(item.sequence));
	const result = {
		...item,
		sequence: guessQualifiedEmojiSequence(unqualifiedSequence)
	};
	if (result.sequenceKey) result.sequenceKey = getEmojiSequenceKeyword(unqualifiedSequence);
	return result;
}
/**
* Get qualified emoji variations for set of emojis, ignoring duplicate entries
*/
function getQualifiedEmojiVariations(items) {
	const results = Object.create(null);
	for (let i = 0; i < items.length; i++) {
		const result = getQualifiedEmojiVariation(items[i]);
		const key = getEmojiSequenceKeyword(getUnqualifiedEmojiSequence(result.sequence));
		if (!results[key] || results[key].sequence.length < result.sequence.length) results[key] = result;
	}
	return Object.values(results);
}

export { getQualifiedEmojiVariation, getQualifiedEmojiVariations, guessQualifiedEmojiSequence };