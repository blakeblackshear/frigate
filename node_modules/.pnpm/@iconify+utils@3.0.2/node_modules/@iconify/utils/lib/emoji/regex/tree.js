import { joinerEmoji } from "../data.js";
import { convertEmojiSequenceToUTF32 } from "../convert.js";
import { splitEmojiSequences } from "../cleanup.js";
import { createOptionalEmojiRegexItem, createSequenceEmojiRegexItem, createSetEmojiRegexItem, createUTF16EmojiRegexItem } from "./base.js";
import { createRegexForNumbersSequence } from "./numbers.js";
import { mergeSimilarItemsInSet } from "./similar.js";

/**
* Create tree
*/
function createEmojisTree(sequences) {
	const root = [];
	for (let i = 0; i < sequences.length; i++) {
		const split = splitEmojiSequences(convertEmojiSequenceToUTF32(sequences[i]));
		let parent = root;
		for (let j = 0; j < split.length; j++) {
			const regex = createRegexForNumbersSequence(split[j]);
			let item;
			const match = parent.find((item$1) => item$1.regex.regex === regex.regex);
			if (!match) {
				item = { regex };
				parent.push(item);
			} else item = match;
			if (j === split.length - 1) {
				item.end = true;
				break;
			}
			parent = item.children || (item.children = []);
		}
	}
	return root;
}
/**
* Parse tree
*/
function parseEmojiTree(items) {
	function mergeParsedChildren(items$1) {
		const parsedItems = [];
		const mapWithoutEnd = Object.create(null);
		const mapWithEnd = Object.create(null);
		for (let i = 0; i < items$1.length; i++) {
			const item = items$1[i];
			const children = item.children;
			if (children) {
				const fullItem = item;
				const target = item.end ? mapWithEnd : mapWithoutEnd;
				const regex = children.regex;
				if (!target[regex]) target[regex] = [fullItem];
				else target[regex].push(fullItem);
			} else parsedItems.push(item.regex);
		}
		[mapWithEnd, mapWithoutEnd].forEach((source) => {
			for (const regex in source) {
				const items$2 = source[regex];
				const firstItem = items$2[0];
				let childSequence = [createUTF16EmojiRegexItem([joinerEmoji]), firstItem.children];
				if (firstItem.end) childSequence = [createOptionalEmojiRegexItem(createSequenceEmojiRegexItem(childSequence))];
				let mergedRegex;
				if (items$2.length === 1) mergedRegex = firstItem.regex;
				else mergedRegex = mergeSimilarItemsInSet(createSetEmojiRegexItem(items$2.map((item) => item.regex)));
				const sequence = createSequenceEmojiRegexItem([mergedRegex, ...childSequence]);
				parsedItems.push(sequence);
			}
		});
		if (parsedItems.length === 1) return parsedItems[0];
		const set = createSetEmojiRegexItem(parsedItems);
		const result = mergeSimilarItemsInSet(set);
		return result;
	}
	function parseItemChildren(item) {
		const result = {
			regex: item.regex,
			end: !!item.end
		};
		const children = item.children;
		if (!children) return result;
		const parsedChildren = children.map(parseItemChildren);
		result.children = mergeParsedChildren(parsedChildren);
		return result;
	}
	const parsed = items.map(parseItemChildren);
	return mergeParsedChildren(parsed);
}

export { createEmojisTree, parseEmojiTree };