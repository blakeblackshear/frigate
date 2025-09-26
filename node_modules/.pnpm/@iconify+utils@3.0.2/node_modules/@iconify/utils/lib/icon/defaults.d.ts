import { ExtendedIconifyIcon, IconifyDimenisons, IconifyIcon, IconifyOptional, IconifyTransformations } from "@iconify/types";
type FullIconifyIcon = Required<IconifyIcon>;
type PartialExtendedIconifyIcon = Partial<ExtendedIconifyIcon>;
type IconifyIconExtraProps = Omit<ExtendedIconifyIcon, keyof IconifyIcon>;
type FullExtendedIconifyIcon = FullIconifyIcon & IconifyIconExtraProps;
/**
 * Default values for dimensions
 */
declare const defaultIconDimensions: Required<IconifyDimenisons>;
/**
 * Default values for transformations
 */
declare const defaultIconTransformations: Required<IconifyTransformations>;
/**
 * Default values for all optional IconifyIcon properties
 */
declare const defaultIconProps: Required<IconifyOptional>;
/**
 * Default values for all properties used in ExtendedIconifyIcon
 */
declare const defaultExtendedIconProps: Required<FullExtendedIconifyIcon>;
export { FullExtendedIconifyIcon, FullIconifyIcon, IconifyIcon, PartialExtendedIconifyIcon, defaultExtendedIconProps, defaultIconDimensions, defaultIconProps, defaultIconTransformations };