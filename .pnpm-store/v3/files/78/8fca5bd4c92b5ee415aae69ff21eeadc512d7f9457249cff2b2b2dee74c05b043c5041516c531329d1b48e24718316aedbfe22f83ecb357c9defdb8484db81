import { emojiComponents } from "../data.js";

/**
* Merge types for unique key
*/
function mergeComponentTypes(value) {
	return "[" + value.join(",") + "]";
}
/**
* Merge count for unique key
*/
function mergeComponentsCount(value) {
	const keys = [];
	for (const key in emojiComponents) {
		const type = key;
		for (let i = 0; i < value[type]; i++) keys.push(type);
	}
	return keys.length ? mergeComponentTypes(keys) : "";
}
/**
* Get item from group
*/
function getGroupItem(items, components) {
	const key = mergeComponentsCount(components);
	const item = items[key];
	if (item) {
		item.parsed = true;
		return item.item;
	}
}
/**
* Convert test data to dependencies tree, based on components
*/
function getEmojiTestDataTree(data) {
	const groups = Object.create(null);
	for (const key in data) {
		const item = data[key];
		const text = item.name.key;
		const parent = groups[text] || (groups[text] = {});
		const components = {
			"hair-style": 0,
			"skin-tone": 0
		};
		item.sequence.forEach((value) => {
			if (typeof value !== "number") components[value]++;
		});
		const componentsKey = mergeComponentsCount(components);
		if (parent[componentsKey]) throw new Error(`Duplicate components tree item for "${text}"`);
		parent[componentsKey] = { item: {
			...item,
			components,
			componentsKey
		} };
	}
	const results = Object.create(null);
	for (const key in groups) {
		const items = groups[key];
		const check = (parent, parentComponents, type) => {
			const item = parse(parentComponents, [type]);
			if (item) {
				const children = parent.children || (parent.children = {});
				children[type] = item;
				return true;
			}
		};
		const parse = (parentComponents, newComponents) => {
			const components = {
				"hair-style": 0,
				"skin-tone": 0
			};
			const componentsList = parentComponents.concat(newComponents);
			componentsList.forEach((type) => {
				components[type]++;
			});
			let item = getGroupItem(items, components);
			if (!item && newComponents.length === 1 && newComponents[0] === "skin-tone") {
				const doubleComponents = { ...components };
				doubleComponents["skin-tone"]++;
				item = getGroupItem(items, doubleComponents);
			}
			if (item) {
				const result = { item };
				for (const key$1 in emojiComponents) check(result, componentsList, key$1);
				return result;
			}
		};
		const root = parse([], []);
		if (!root) throw new Error(`Cannot find parent item for "${key}"`);
		for (const itemsKey in items) if (!items[itemsKey].parsed) throw new Error(`Error generating tree for "${key}"`);
		if (root.children) results[key] = root;
	}
	return results;
}

export { getEmojiTestDataTree };