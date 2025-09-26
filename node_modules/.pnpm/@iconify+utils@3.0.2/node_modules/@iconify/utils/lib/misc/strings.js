/**
* Convert string to camelCase
*/
function camelize(str) {
	return str.replace(/-([a-z0-9])/g, (g) => g[1].toUpperCase());
}
/**
* Convert string to PascaleCase
*/
function pascalize(str) {
	const camel = camelize(str);
	return camel.slice(0, 1).toUpperCase() + camel.slice(1);
}
/**
* Convert camelCase string to kebab-case
*/
function camelToKebab(key) {
	const result = key.replace(/:/g, "-").replace(/([A-Z])/g, " $1").trim();
	return result.split(/\s+/g).join("-").toLowerCase();
}
/**
* Convert camelCase string to snake-case
*/
function snakelize(str) {
	const kebab = camelToKebab(str);
	return kebab.replace(/-/g, "_");
}

export { camelToKebab, camelize, pascalize, snakelize };