/**
* IDs usage:
*
* id="{id}"
* xlink:href="#{id}"
* url(#{id})
*
* From SVG animations:
*
* begin="0;{id}.end"
* begin="{id}.end"
* begin="{id}.click"
*/
/**
* Regular expression for finding ids
*/
const regex = /\sid="(\S+)"/g;
/**
* New random-ish prefix for ids
*
* Do not use dash, it cannot be used in SVG 2 animations
*/
const randomPrefix = "IconifyId" + Date.now().toString(16) + (Math.random() * 16777216 | 0).toString(16);
/**
* Counter for ids, increasing with every replacement
*/
let counter = 0;
/**
* Replace IDs in SVG output with unique IDs
*/
function replaceIDs(body, prefix = randomPrefix) {
	const ids = [];
	let match;
	while (match = regex.exec(body)) ids.push(match[1]);
	if (!ids.length) return body;
	const suffix = "suffix" + (Math.random() * 16777216 | Date.now()).toString(16);
	ids.forEach((id) => {
		const newID = typeof prefix === "function" ? prefix(id) : prefix + (counter++).toString();
		const escapedID = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		body = body.replace(new RegExp("([#;\"])(" + escapedID + ")([\")]|\\.[a-z])", "g"), "$1" + newID + suffix + "$3");
	});
	body = body.replace(new RegExp(suffix, "g"), "");
	return body;
}

export { replaceIDs };