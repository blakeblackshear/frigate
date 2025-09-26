import { getEmojiSequenceFromString, getUnqualifiedEmojiSequence } from "./cleanup.js";
import { getEmojiSequenceKeyword } from "./format.js";
import { parseEmojiTestFile } from "./test/parse.js";
import { getQualifiedEmojiVariations } from "./test/variations.js";
import { findMissingEmojis } from "./test/missing.js";
import { createOptimisedRegexForEmojiSequences } from "./regex/create.js";
import { combineSimilarEmojiTestData } from "./test/similar.js";
import { getEmojiTestDataTree } from "./test/tree.js";

/**
* Prepare emoji for icons list
*
* Test data should be fetched from 'https://unicode.org/Public/emoji/17.0/emoji-test.txt'
* It is used to detect missing emojis and optimise regular expression
*/
function prepareEmojiForIconsList(icons, rawTestData) {
	const testData = rawTestData ? parseEmojiTestFile(rawTestData) : void 0;
	let iconsList = [];
	for (const char in icons) {
		const sequence = getEmojiSequenceFromString(char);
		iconsList.push({
			icon: icons[char],
			sequence
		});
	}
	iconsList = getQualifiedEmojiVariations(iconsList);
	if (testData) iconsList = iconsList.concat(findMissingEmojis(iconsList, getEmojiTestDataTree(combineSimilarEmojiTestData(testData))));
	const preparedIcons = iconsList.map((item) => {
		const sequence = getEmojiSequenceKeyword(getUnqualifiedEmojiSequence(item.sequence));
		return {
			icon: item.icon,
			sequence
		};
	});
	const regex = createOptimisedRegexForEmojiSequences(iconsList.map((item) => item.sequence));
	return {
		regex,
		icons: preparedIcons
	};
}
/**
* Prepare emoji for an icon set
*
* Test data should be fetched from 'https://unicode.org/Public/emoji/15.1/emoji-test.txt'
* It is used to detect missing emojis and optimise regular expression
*/
function prepareEmojiForIconSet(iconSet, rawTestData) {
	return prepareEmojiForIconsList(iconSet.chars || {}, rawTestData);
}

export { prepareEmojiForIconSet, prepareEmojiForIconsList };