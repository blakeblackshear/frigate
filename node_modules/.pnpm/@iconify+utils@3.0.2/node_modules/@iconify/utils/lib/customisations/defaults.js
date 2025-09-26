import { defaultIconTransformations } from "../icon/defaults.js";

/**
* Default icon customisations values
*/
const defaultIconSizeCustomisations = Object.freeze({
	width: null,
	height: null
});
const defaultIconCustomisations = Object.freeze({
	...defaultIconSizeCustomisations,
	...defaultIconTransformations
});

export { defaultIconCustomisations, defaultIconSizeCustomisations };