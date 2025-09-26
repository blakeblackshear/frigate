/**
* Compares two objects, returns true if identical
*
* Reference object contains keys
*/
function compareObjects(obj1, obj2, ref = obj1) {
	for (const key in ref) if (obj1[key] !== obj2[key]) return false;
	return Object.keys(obj1).length === Object.keys(obj2).length;
}
/**
* Unmerge objects, removing items that match in both objects
*/
function unmergeObjects(obj1, obj2) {
	const result = { ...obj1 };
	for (const key in obj2) if (result[key] === obj2[key]) delete result[key];
	return result;
}
/**
* Get common properties in 2 objects
*/
function commonObjectProps(item, reference) {
	const result = Object.create(null);
	for (const key in reference) if (key in item) result[key] = item[key];
	return result;
}

export { commonObjectProps, compareObjects, unmergeObjects };