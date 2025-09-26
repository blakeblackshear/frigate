import { getPossibleIconNames } from "./utils.js";
import { searchForIcon } from "./modern.js";
import { loadIcon } from "./loader.js";
import { warnOnce } from "./warn.js";
import { loadCollectionFromFS } from "./fs.js";

const loadNodeIcon = async (collection, icon, options) => {
	let result = await loadIcon(collection, icon, options);
	if (result) return result;
	const cwds = Array.isArray(options?.cwd) ? options.cwd : [options?.cwd];
	for (let i = 0; i < cwds.length; i++) {
		const iconSet = await loadCollectionFromFS(collection, i === cwds.length - 1 ? options?.autoInstall : false, void 0, cwds[i]);
		if (iconSet) {
			result = await searchForIcon(iconSet, collection, getPossibleIconNames(icon), options);
			if (result) return result;
		}
	}
	if (options?.warn) warnOnce(`failed to load ${options.warn} icon`);
};

export { loadNodeIcon };