import { getPossibleIconNames } from "./utils.js";
import { searchForIcon } from "./modern.js";
import { warnOnce } from "./warn.js";
import { loadCollectionFromFS } from "./fs.js";

/**
* Creates a CustomIconLoader collection from an external package collection.
*
* @param packageName The package name.
* @param autoInstall {AutoInstall} [autoInstall=false] - whether to automatically install
*/
function createExternalPackageIconLoader(packageName, autoInstall = false, cwd) {
	let scope;
	let collection;
	const collections = {};
	if (typeof packageName === "string") {
		if (packageName.length === 0) {
			warnOnce(`invalid package name, it is empty`);
			return collections;
		}
		if (packageName[0] === "@") {
			if (packageName.indexOf("/") === -1) {
				warnOnce(`invalid scoped package name "${packageName}"`);
				return collections;
			}
			[scope, collection] = packageName.split("/");
		} else {
			scope = "";
			collection = packageName;
		}
	} else [scope, collection] = packageName;
	collections[collection] = createCustomIconLoader(scope, collection, autoInstall, cwd);
	return collections;
}
function createCustomIconLoader(scope, collection, autoInstall, cwd) {
	const iconSetPromise = loadCollectionFromFS(collection, autoInstall, scope, cwd);
	return (async (icon) => {
		const iconSet = await iconSetPromise;
		let result;
		if (iconSet) result = await searchForIcon(iconSet, collection, getPossibleIconNames(icon));
		return result;
	});
}

export { createExternalPackageIconLoader };