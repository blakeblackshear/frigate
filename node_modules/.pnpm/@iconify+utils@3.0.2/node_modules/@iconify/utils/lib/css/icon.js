import { defaultIconProps } from "../icon/defaults.js";
import { generateItemCSSRules, generateItemContent, getCommonCSSRules } from "./common.js";
import { formatCSS } from "./format.js";

/**
* Get CSS for icon, rendered as background or mask
*/
function getIconCSS(icon, options = {}) {
	const body = options.customise ? options.customise(icon.body) : icon.body;
	const mode = options.mode || (options.color || !body.includes("currentColor") ? "background" : "mask");
	let varName = options.varName;
	if (varName === void 0 && mode === "mask") varName = "svg";
	const newOptions = {
		...options,
		mode,
		varName
	};
	if (mode === "background") delete newOptions.varName;
	const rules = {
		...options.rules,
		...getCommonCSSRules(newOptions),
		...generateItemCSSRules({
			...defaultIconProps,
			...icon,
			body
		}, newOptions)
	};
	const selector = options.iconSelector || ".icon";
	return formatCSS([{
		selector,
		rules
	}], newOptions.format);
}
/**
* Get CSS for icon, rendered as content
*/
function getIconContentCSS(icon, options) {
	const body = options.customise ? options.customise(icon.body) : icon.body;
	const content = generateItemContent({
		...defaultIconProps,
		...icon,
		body
	}, options);
	const selector = options.iconSelector || ".icon::after";
	return formatCSS([{
		selector,
		rules: {
			...options.rules,
			content
		}
	}], options.format);
}

export { getIconCSS, getIconContentCSS };