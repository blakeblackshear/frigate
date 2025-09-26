const CUSTOM_PROPERTY_REGEX = /^--[a-zA-Z0-9_-]+$/;
const HYPHEN_REGEX = /-([a-z])/g;
const NO_HYPHEN_REGEX = /^[^-]+$/;
const VENDOR_PREFIX_REGEX = /^-(webkit|moz|ms|o|khtml)-/;
const MS_VENDOR_PREFIX_REGEX = /^-(ms)-/;

/**
 * Checks whether to skip camelCase.
 */
const skipCamelCase = (property: string) =>
  !property ||
  NO_HYPHEN_REGEX.test(property) ||
  CUSTOM_PROPERTY_REGEX.test(property);

/**
 * Replacer that capitalizes first character.
 */
const capitalize = (match: string, character: string) =>
  character.toUpperCase();

/**
 * Replacer that removes beginning hyphen of vendor prefix property.
 */
const trimHyphen = (match: string, prefix: string) => `${prefix}-`;

/**
 * CamelCase options.
 */
export interface CamelCaseOptions {
  reactCompat?: boolean;
}

/**
 * CamelCases a CSS property.
 */
export const camelCase = (property: string, options: CamelCaseOptions = {}) => {
  if (skipCamelCase(property)) {
    return property;
  }

  property = property.toLowerCase();

  if (options.reactCompat) {
    // `-ms` vendor prefix should not be capitalized
    property = property.replace(MS_VENDOR_PREFIX_REGEX, trimHyphen);
  } else {
    // for non-React, remove first hyphen so vendor prefix is not capitalized
    property = property.replace(VENDOR_PREFIX_REGEX, trimHyphen);
  }

  return property.replace(HYPHEN_REGEX, capitalize);
};
