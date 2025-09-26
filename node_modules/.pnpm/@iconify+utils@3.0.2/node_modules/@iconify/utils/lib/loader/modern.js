import { defaultIconCustomisations } from "../customisations/defaults.js";
import { getIconData } from "../icon-set/get-icon.js";
import { calculateSize } from "../svg/size.js";
import { iconToSVG, isUnsetKeyword } from "../svg/build.js";
import { mergeIconProps } from "./utils.js";
import createDebugger from "debug";

const debug = createDebugger("@iconify-loader:icon");
async function searchForIcon(iconSet, collection, ids, options) {
	let iconData;
	const { customize } = options?.customizations ?? {};
	for (const id of ids) {
		iconData = getIconData(iconSet, id);
		if (iconData) {
			debug(`${collection}:${id}`);
			let defaultCustomizations = { ...defaultIconCustomisations };
			if (typeof customize === "function") {
				iconData = Object.assign({}, iconData);
				defaultCustomizations = customize(defaultCustomizations, iconData, `${collection}:${id}`) ?? defaultCustomizations;
			}
			const { attributes: { width, height,...restAttributes }, body } = iconToSVG(iconData, defaultCustomizations);
			const scale = options?.scale;
			return await mergeIconProps(`<svg >${body}</svg>`, collection, id, options, () => {
				return { ...restAttributes };
			}, (props) => {
				const check = (prop, defaultValue) => {
					const propValue = props[prop];
					let value;
					if (!isUnsetKeyword(propValue)) {
						if (propValue) return;
						if (typeof scale === "number") {
							if (scale) value = calculateSize(defaultValue ?? "1em", scale);
						} else value = defaultValue;
					}
					if (!value) delete props[prop];
					else props[prop] = value;
				};
				check("width", width);
				check("height", height);
			});
		}
	}
}

export { searchForIcon };