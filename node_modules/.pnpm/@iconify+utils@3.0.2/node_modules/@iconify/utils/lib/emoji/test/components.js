import { emojiComponents } from "../data.js";
import { getEmojiSequenceKeyword } from "../format.js";

/**
* Map components from test data
*/
function mapEmojiTestDataComponents(testSequences) {
	const results = {
		converted: /* @__PURE__ */ new Map(),
		items: /* @__PURE__ */ new Map(),
		names: /* @__PURE__ */ new Map(),
		types: {},
		keywords: {}
	};
	for (const key in emojiComponents) {
		const type = key;
		const range = emojiComponents[type];
		for (let number = range[0]; number < range[1]; number++) {
			const keyword = getEmojiSequenceKeyword([number]);
			const item = testSequences[keyword];
			if (!item) throw new Error(`Missing emoji component in test sequence: "${keyword}"`);
			results.converted.set(number, keyword);
			results.items.set(number, item);
			results.items.set(keyword, item);
			const name = item.name;
			results.names.set(number, name);
			results.names.set(keyword, name);
			results.types[name] = type;
			results.keywords[name] = keyword;
		}
	}
	return results;
}
/**
* Convert to string
*/
function emojiSequenceWithComponentsToString(sequence) {
	return sequence.map((item) => typeof item === "number" ? item.toString(16) : item).join("-");
}
/**
* Find variations in sequence
*/
function findEmojiComponentsInSequence(sequence) {
	const components = [];
	for (let index = 0; index < sequence.length; index++) {
		const code = sequence[index];
		for (const key in emojiComponents) {
			const type = key;
			const range = emojiComponents[type];
			if (code >= range[0] && code < range[1]) {
				components.push({
					index,
					type
				});
				break;
			}
		}
	}
	return components;
}
/**
* Replace components in sequence
*/
function replaceEmojiComponentsInCombinedSequence(sequence, values) {
	const indexes = {
		"hair-style": 0,
		"skin-tone": 0
	};
	return sequence.map((item) => {
		if (typeof item === "number") return item;
		const index = indexes[item]++;
		const list = values[item];
		if (!list || !list.length) throw new Error(`Cannot replace ${item}: no valid values provided`);
		return list[index >= list.length ? list.length - 1 : index];
	});
}

export { emojiSequenceWithComponentsToString, findEmojiComponentsInSequence, mapEmojiTestDataComponents, replaceEmojiComponentsInCombinedSequence };