import { wrapSVGContent } from "./defs.js";
import { getSVGViewBox } from "./viewbox.js";

/**
* Extract attributes and content from SVG
*/
function parseSVGContent(content) {
	const match = content.trim().match(/(?:<(?:\?xml|!DOCTYPE)[^>]+>\s*)*<svg([^>]+)>([\s\S]+)<\/svg[^>]*>/);
	if (!match) return;
	const body = match[2].trim();
	const attribsList = match[1].match(/[\w:-]+="[^"]*"/g);
	const attribs = Object.create(null);
	attribsList?.forEach((row) => {
		const match$1 = row.match(/([\w:-]+)="([^"]*)"/);
		if (match$1) attribs[match$1[1]] = match$1[2];
	});
	return {
		attribs,
		body
	};
}
function build(data) {
	const attribs = data.attribs;
	const viewBox = getSVGViewBox(attribs["viewBox"] ?? "");
	if (!viewBox) return;
	const groupAttributes = [];
	for (const key in attribs) if (key === "style" || key.startsWith("fill") || key.startsWith("stroke")) groupAttributes.push(`${key}="${attribs[key]}"`);
	let body = data.body;
	if (groupAttributes.length) body = wrapSVGContent(body, "<g " + groupAttributes.join(" ") + ">", "</g>");
	return {
		width: attribs.width,
		height: attribs.height,
		viewBox,
		body
	};
}
/**
* Convert parsed SVG to IconifyIconBuildResult
*/
function buildParsedSVG(data) {
	const result = build(data);
	if (result) return {
		attributes: {
			width: result.width,
			height: result.height,
			viewBox: result.viewBox.join(" ")
		},
		viewBox: result.viewBox,
		body: result.body
	};
}
/**
* Convert parsed SVG to IconifyIcon
*/
function convertParsedSVG(data) {
	const result = build(data);
	if (result) {
		const viewBox = result.viewBox;
		return {
			left: viewBox[0],
			top: viewBox[1],
			width: viewBox[2],
			height: viewBox[3],
			body: result.body
		};
	}
}

export { buildParsedSVG, convertParsedSVG, parseSVGContent };