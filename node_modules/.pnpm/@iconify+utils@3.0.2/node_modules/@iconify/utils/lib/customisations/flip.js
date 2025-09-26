const separator = /[\s,]+/;
/**
* Apply "flip" string to icon customisations
*/
function flipFromString(custom, flip) {
	flip.split(separator).forEach((str) => {
		const value = str.trim();
		switch (value) {
			case "horizontal":
				custom.hFlip = true;
				break;
			case "vertical":
				custom.vFlip = true;
				break;
		}
	});
}

export { flipFromString };