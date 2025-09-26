import { getCustomIcon } from "./custom.js";
import { searchForIcon } from "./modern.js";

const loadIcon = async (collection, icon, options) => {
	const custom = options?.customCollections?.[collection];
	if (custom) if (typeof custom === "function") {
		let result;
		try {
			result = await custom(icon);
		} catch (err) {
			console.warn(`Failed to load custom icon "${icon}" in "${collection}":`, err);
			return;
		}
		if (result) {
			if (typeof result === "string") return await getCustomIcon(() => result, collection, icon, options);
			if ("icons" in result) {
				const ids = [
					icon,
					icon.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
					icon.replace(/([a-z])(\d+)/g, "$1-$2")
				];
				return await searchForIcon(result, collection, ids, options);
			}
		}
	} else return await getCustomIcon(custom, collection, icon, options);
};

export { loadIcon };