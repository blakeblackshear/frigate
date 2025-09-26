import { defaultIconProps } from "../icon/defaults.js";
import { getIconData } from "../icon-set/get-icon.js";
import { generateItemCSSRules, generateItemContent, getCommonCSSRules } from "./common.js";
import { formatCSS } from "./format.js";

const commonSelector = ".icon--{prefix}";
const iconSelector = ".icon--{prefix}--{name}";
const contentSelector = ".icon--{prefix}--{name}::after";
const defaultSelectors = {
	commonSelector,
	iconSelector,
	overrideSelector: commonSelector + iconSelector
};
/**
* Get data for getIconsCSS()
*/
function getIconsCSSData(iconSet, names, options = {}) {
	const css = [];
	const errors = [];
	const palette = options.color ? true : void 0;
	let mode = options.mode || typeof palette === "boolean" && (palette ? "background" : "mask");
	if (!mode) {
		for (let i = 0; i < names.length; i++) {
			const name = names[i];
			const icon = getIconData(iconSet, name);
			if (icon) {
				const body = options.customise ? options.customise(icon.body, name) : icon.body;
				mode = body.includes("currentColor") ? "mask" : "background";
				break;
			}
		}
		if (!mode) {
			mode = "mask";
			errors.push("/* cannot detect icon mode: not set in options and icon set is missing info, rendering as " + mode + " */");
		}
	}
	let varName = options.varName;
	if (varName === void 0 && mode === "mask") varName = "svg";
	const newOptions = {
		...options,
		mode,
		varName
	};
	const { commonSelector: commonSelector$1, iconSelector: iconSelector$1, overrideSelector } = newOptions.iconSelector ? newOptions : defaultSelectors;
	const iconSelectorWithPrefix = iconSelector$1.replace(/{prefix}/g, iconSet.prefix);
	const commonRules = {
		...options.rules,
		...getCommonCSSRules(newOptions)
	};
	const hasCommonRules = commonSelector$1 && commonSelector$1 !== iconSelector$1;
	const commonSelectors = /* @__PURE__ */ new Set();
	if (hasCommonRules) css.push({
		selector: commonSelector$1.replace(/{prefix}/g, iconSet.prefix),
		rules: commonRules
	});
	for (let i = 0; i < names.length; i++) {
		const name = names[i];
		const iconData = getIconData(iconSet, name);
		if (!iconData) {
			errors.push("/* Could not find icon: " + name + " */");
			continue;
		}
		const body = options.customise ? options.customise(iconData.body, name) : iconData.body;
		const rules = generateItemCSSRules({
			...defaultIconProps,
			...iconData,
			body
		}, newOptions);
		let requiresOverride = false;
		if (hasCommonRules && overrideSelector) {
			for (const key in rules) if (key in commonRules) requiresOverride = true;
		}
		const selector = (requiresOverride && overrideSelector ? overrideSelector.replace(/{prefix}/g, iconSet.prefix) : iconSelectorWithPrefix).replace(/{name}/g, name);
		css.push({
			selector,
			rules
		});
		if (!hasCommonRules) commonSelectors.add(selector);
	}
	const result = {
		css,
		errors
	};
	if (!hasCommonRules && commonSelectors.size) {
		const selector = Array.from(commonSelectors).join(newOptions.format === "compressed" ? "," : ", ");
		result.common = {
			selector,
			rules: commonRules
		};
	}
	return result;
}
/**
* Get CSS for icons as background/mask
*/
function getIconsCSS(iconSet, names, options = {}) {
	const { css, errors, common } = getIconsCSSData(iconSet, names, options);
	if (common) if (css.length === 1 && css[0].selector === common.selector) css[0].rules = {
		...common.rules,
		...css[0].rules
	};
	else css.unshift(common);
	return formatCSS(css, options.format) + (errors.length ? "\n" + errors.join("\n") + "\n" : "");
}
/**
* Get CSS for icons as content
*/
function getIconsContentCSS(iconSet, names, options) {
	const errors = [];
	const css = [];
	const iconSelectorWithPrefix = (options.iconSelector ?? contentSelector).replace(/{prefix}/g, iconSet.prefix);
	for (let i = 0; i < names.length; i++) {
		const name = names[i];
		const iconData = getIconData(iconSet, name);
		if (!iconData) {
			errors.push("/* Could not find icon: " + name + " */");
			continue;
		}
		const body = options.customise ? options.customise(iconData.body, name) : iconData.body;
		const content = generateItemContent({
			...defaultIconProps,
			...iconData,
			body
		}, options);
		const selector = iconSelectorWithPrefix.replace(/{name}/g, name);
		css.push({
			selector,
			rules: {
				...options.rules,
				content
			}
		});
	}
	return formatCSS(css, options.format) + (errors.length ? "\n" + errors.join("\n") + "\n" : "");
}

export { getIconsCSS, getIconsCSSData, getIconsContentCSS };