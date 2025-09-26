/**
* Get viewBox from string
*/
function getSVGViewBox(value) {
	const result = value.trim().split(/\s+/).map(Number);
	if (result.length === 4 && result.reduce((prev, value$1) => prev && !isNaN(value$1), true)) return result;
}

export { getSVGViewBox };