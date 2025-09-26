import { vs16Emoji } from "../data.js";
import { emojiSequenceWithComponentsToString, mapEmojiTestDataComponents } from "./components.js";
import { splitEmojiNameVariations } from "./name.js";

/**
* Find components in item, generate CombinedEmojiTestDataItem
*/
function findComponentsInEmojiTestItem(item, componentsData) {
	const name = splitEmojiNameVariations(item.name, item.sequence, componentsData);
	const sequence = [...item.sequence];
	name.variations?.forEach((item$1) => {
		if (typeof item$1 !== "string") sequence[item$1.index] = item$1.type;
	});
	const sequenceKey = emojiSequenceWithComponentsToString(sequence.filter((code) => code !== vs16Emoji));
	return {
		...item,
		name,
		sequenceKey,
		sequence
	};
}
/**
* Combine similar items in one iteratable item
*/
function combineSimilarEmojiTestData(data, componentsData) {
	const results = Object.create(null);
	componentsData = componentsData || mapEmojiTestDataComponents(data);
	for (const key in data) {
		const sourceItem = data[key];
		if (sourceItem.status !== "component") {
			const item = findComponentsInEmojiTestItem(sourceItem, componentsData);
			results[item.sequenceKey] = item;
		}
	}
	return results;
}

export { combineSimilarEmojiTestData, findComponentsInEmojiTestItem };