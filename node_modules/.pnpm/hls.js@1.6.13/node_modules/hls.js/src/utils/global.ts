/** returns `undefined` is `self` is missing, e.g. in node */
export const optionalSelf = typeof self !== 'undefined' ? self : undefined;
