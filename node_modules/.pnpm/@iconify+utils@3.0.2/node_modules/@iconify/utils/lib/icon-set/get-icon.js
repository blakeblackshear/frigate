import { mergeIconData } from "../icon/merge.js";
import { getIconsTree } from "./tree.js";

/**
* Get icon data, using prepared aliases tree
*/
function internalGetIconData(data, name, tree) {
	const icons = data.icons;
	const aliases = data.aliases || Object.create(null);
	let currentProps = {};
	function parse(name$1) {
		currentProps = mergeIconData(icons[name$1] || aliases[name$1], currentProps);
	}
	parse(name);
	tree.forEach(parse);
	return mergeIconData(data, currentProps);
}
/**
* Get data for icon
*/
function getIconData(data, name) {
	if (data.icons[name]) return internalGetIconData(data, name, []);
	const tree = getIconsTree(data, [name])[name];
	return tree ? internalGetIconData(data, name, tree) : null;
}

export { getIconData, internalGetIconData };