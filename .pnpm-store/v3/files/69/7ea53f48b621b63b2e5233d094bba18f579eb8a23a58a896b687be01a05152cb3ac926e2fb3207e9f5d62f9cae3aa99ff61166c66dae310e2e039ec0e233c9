import { emojiComponents } from "../data.js";
import { getUnqualifiedEmojiSequence } from "../cleanup.js";
import { getEmojiSequenceKeyword } from "../format.js";
import { replaceEmojiComponentsInCombinedSequence } from "./components.js";

/**
* Find missing emojis
*
* Result includes missing items, which are extended from items that needs to
* be copied. To identify which emojis to copy, source object should include
* something like `iconName` key that points to icon sequence represents.
*/
function findMissingEmojis(sequences, testDataTree) {
	const results = [];
	const existingItems = Object.create(null);
	const copiedItems = Object.create(null);
	sequences.forEach((item) => {
		const sequence = getUnqualifiedEmojiSequence(item.sequence);
		const key = getEmojiSequenceKeyword(sequence);
		if (!existingItems[key] || existingItems[key].sequence.length < item.sequence.length) existingItems[key] = item;
	});
	const iterate = (type, parentTree, parentValues, parentItem, deep) => {
		const childTree = parentTree.children?.[type];
		if (!childTree) return;
		const range = emojiComponents[type];
		for (let number = range[0]; number < range[1]; number++) {
			const values = {
				"hair-style": [...parentValues["hair-style"]],
				"skin-tone": [...parentValues["skin-tone"]]
			};
			values[type].push(number);
			const sequence = replaceEmojiComponentsInCombinedSequence(childTree.item.sequence, values);
			const key = getEmojiSequenceKeyword(getUnqualifiedEmojiSequence(sequence));
			const oldItem = existingItems[key];
			let item;
			if (oldItem) item = oldItem;
			else {
				item = copiedItems[key];
				if (!item) {
					item = {
						...parentItem,
						sequence
					};
					if (item.sequenceKey) item.sequenceKey = key;
					copiedItems[key] = item;
					results.push(item);
				}
			}
			if (deep || oldItem) for (const key$1 in values) iterate(key$1, childTree, values, item, deep);
		}
	};
	const parse = (key, deep) => {
		const treeItem = testDataTree[key];
		const sequenceKey = treeItem.item.sequenceKey;
		const rootItem = existingItems[sequenceKey];
		if (!rootItem) return;
		const values = {
			"skin-tone": [],
			"hair-style": []
		};
		for (const key$1 in values) iterate(key$1, treeItem, values, rootItem, deep);
	};
	for (const key in testDataTree) {
		parse(key, false);
		parse(key, true);
	}
	return results;
}

export { findMissingEmojis };