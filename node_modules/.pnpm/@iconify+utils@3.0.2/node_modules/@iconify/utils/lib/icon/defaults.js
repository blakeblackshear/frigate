/**
* Default values for dimensions
*/
const defaultIconDimensions = Object.freeze({
	left: 0,
	top: 0,
	width: 16,
	height: 16
});
/**
* Default values for transformations
*/
const defaultIconTransformations = Object.freeze({
	rotate: 0,
	vFlip: false,
	hFlip: false
});
/**
* Default values for all optional IconifyIcon properties
*/
const defaultIconProps = Object.freeze({
	...defaultIconDimensions,
	...defaultIconTransformations
});
/**
* Default values for all properties used in ExtendedIconifyIcon
*/
const defaultExtendedIconProps = Object.freeze({
	...defaultIconProps,
	body: "",
	hidden: false
});

export { defaultExtendedIconProps, defaultIconDimensions, defaultIconProps, defaultIconTransformations };