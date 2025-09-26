import { defaultIconDimensions } from "../icon/defaults.js";

/**
* Expand minified icon set
*
* Opposite of minifyIconSet() from ./minify.ts
*/
function expandIconSet(data) {
	const icons = Object.keys(data.icons);
	Object.keys(defaultIconDimensions).forEach((prop) => {
		if (typeof data[prop] !== typeof defaultIconDimensions[prop]) return;
		const value = data[prop];
		icons.forEach((name) => {
			const item = data.icons[name];
			if (!(prop in item)) item[prop] = value;
		});
		delete data[prop];
	});
}

export { expandIconSet };