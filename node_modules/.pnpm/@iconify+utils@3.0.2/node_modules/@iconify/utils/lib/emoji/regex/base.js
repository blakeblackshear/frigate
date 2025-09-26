/**
* Convert number to string
*/
function toString(number) {
	if (number < 255) {
		if (number > 32 && number < 127) {
			const char = String.fromCharCode(number);
			if (number > 47 && number < 58 || number > 64 && number < 91 || number > 94 && number < 123) return char;
			return "\\" + char;
		}
		return "\\x" + (number < 16 ? "0" : "") + number.toString(16).toUpperCase();
	}
	return "\\u" + number.toString(16).toUpperCase();
}
/**
* Typescript stuff
*/
function assertNever(v) {}
/**
* Wrap regex in group
*/
function wrapRegexInGroup(regex) {
	return "(?:" + regex + ")";
}
/**
* Update UTF16 item, return regex
*/
function updateUTF16EmojiRegexItem(item) {
	const numbers = item.numbers;
	if (numbers.length === 1) {
		const num = numbers[0];
		return item.regex = toString(num);
	}
	numbers.sort((a, b) => a - b);
	const chars = [];
	let range = null;
	const addRange = () => {
		if (range) {
			const { start, last, numbers: numbers$1 } = range;
			range = null;
			if (last > start + 1) chars.push(toString(start) + "-" + toString(last));
			else for (let i = 0; i < numbers$1.length; i++) chars.push(toString(numbers$1[i]));
		}
	};
	for (let i = 0; i < numbers.length; i++) {
		const num = numbers[i];
		if (range) {
			if (range.last === num) continue;
			if (range.last === num - 1) {
				range.numbers.push(num);
				range.last = num;
				continue;
			}
		}
		addRange();
		range = {
			start: num,
			last: num,
			numbers: [num]
		};
	}
	addRange();
	if (!chars.length) throw new Error("Unexpected empty range");
	return item.regex = "[" + chars.join("") + "]";
}
/**
* Create UTF-16 regex
*/
function createUTF16EmojiRegexItem(numbers) {
	const result = {
		type: "utf16",
		regex: "",
		numbers,
		length: 1,
		group: true
	};
	updateUTF16EmojiRegexItem(result);
	return result;
}
/**
* Update sequence regex. Does not update group
*/
function updateSequenceEmojiRegexItem(item) {
	return item.regex = item.items.map((childItem) => {
		if (!childItem.group && childItem.type === "set") return wrapRegexInGroup(childItem.regex);
		return childItem.regex;
	}).join("");
}
/**
* Create sequence regex
*/
function createSequenceEmojiRegexItem(sequence, numbers) {
	let items = [];
	sequence.forEach((item) => {
		if (item.type === "sequence") items = items.concat(item.items);
		else items.push(item);
	});
	if (!items.length) throw new Error("Empty sequence");
	const result = {
		type: "sequence",
		items,
		regex: "",
		length: items.reduce((length, item) => item.length + length, 0),
		group: false
	};
	if (sequence.length === 1) {
		const firstItem = sequence[0];
		result.group = firstItem.group;
		if (firstItem.type !== "optional") {
			const numbers$1 = firstItem.numbers;
			if (numbers$1) result.numbers = numbers$1;
		}
	}
	if (numbers) result.numbers = numbers;
	updateSequenceEmojiRegexItem(result);
	return result;
}
/**
* Update set regex and group
*/
function updateSetEmojiRegexItem(item) {
	if (item.sets.length === 1) {
		const firstItem = item.sets[0];
		item.group = firstItem.group;
		return item.regex = firstItem.regex;
	}
	item.group = false;
	return item.regex = item.sets.map((childItem) => childItem.regex).join("|");
}
/**
* Create set regex
*/
function createSetEmojiRegexItem(set) {
	let sets = [];
	let numbers = [];
	set.forEach((item) => {
		if (item.type === "set") sets = sets.concat(item.sets);
		else sets.push(item);
		if (numbers) if (item.type === "optional" || !item.numbers) numbers = null;
		else numbers = [...numbers, ...item.numbers];
	});
	sets.sort((a, b) => {
		if (a.length === b.length) return a.regex.localeCompare(b.regex);
		return b.length - a.length;
	});
	const result = {
		type: "set",
		sets,
		regex: "",
		length: sets.reduce((length, item) => length ? Math.min(length, item.length) : item.length, 0),
		group: false
	};
	if (numbers) result.numbers = numbers;
	if (set.length === 1) {
		const firstItem = set[0];
		result.group = firstItem.group;
	}
	updateSetEmojiRegexItem(result);
	return result;
}
/**
* Update optional regex
*/
function updateOptionalEmojiRegexItem(item) {
	const childItem = item.item;
	const regex = (childItem.group ? childItem.regex : wrapRegexInGroup(childItem.regex)) + "?";
	return item.regex = regex;
}
/**
* Create optional item
*/
function createOptionalEmojiRegexItem(item) {
	if (item.type === "optional") return item;
	const result = {
		type: "optional",
		item,
		regex: "",
		length: item.length,
		group: true
	};
	updateOptionalEmojiRegexItem(result);
	return result;
}
/**
* Clone item
*/
function cloneEmojiRegexItem(item, shallow = false) {
	const result = { ...item };
	if (result.type !== "optional" && result.numbers) result.numbers = [...result.numbers];
	switch (result.type) {
		case "utf16": break;
		case "sequence":
			if (shallow) result.items = [...result.items];
			else result.items = result.items.map((item$1) => cloneEmojiRegexItem(item$1, false));
			break;
		case "set":
			if (shallow) result.sets = [...result.sets];
			else result.sets = result.sets.map((item$1) => cloneEmojiRegexItem(item$1, false));
			break;
		case "optional":
			if (!shallow) result.item = cloneEmojiRegexItem(result.item, false);
			break;
		default: assertNever(result);
	}
	return result;
}

export { cloneEmojiRegexItem, createOptionalEmojiRegexItem, createSequenceEmojiRegexItem, createSetEmojiRegexItem, createUTF16EmojiRegexItem, updateOptionalEmojiRegexItem, updateSequenceEmojiRegexItem, updateSetEmojiRegexItem, updateUTF16EmojiRegexItem, wrapRegexInGroup };