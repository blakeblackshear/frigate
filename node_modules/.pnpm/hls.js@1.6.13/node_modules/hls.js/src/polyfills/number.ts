// https://caniuse.com/mdn-javascript_builtins_number_isfinite
export const isFiniteNumber =
  Number.isFinite ||
  function (value) {
    return typeof value === 'number' && isFinite(value);
  };

// https://caniuse.com/mdn-javascript_builtins_number_issafeinteger
export const isSafeInteger =
  Number.isSafeInteger ||
  function (value) {
    return typeof value === 'number' && Math.abs(value) <= MAX_SAFE_INTEGER;
  };

export const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;
