// @preval

require("@babel/register");

// Fast way to compare RGL props in shouldComponentUpdate.
// Generates the fastest possible comparison of the type:
// function (a, b) { return a.className === b.className && a.style === b.style && ... }
// This avoids enumerating keys, avoids us keeping our own key list, and can be very easily optimized.

const PropTypes = require("prop-types");
const propTypes = require("./ReactGridLayoutPropTypes").default;
const keys = Object.keys(propTypes);

// Remove 'children' key as we don't want to compare it
keys.splice(keys.indexOf("children"), 1);

// Returns a code string indicating what to do here.
// In most cases we want to do a simple equality comparison,
// but we have some arrays and tuples and objects we want
// to do a shallow comparison on.
function getEqualType(key) {
  if (
    [
      PropTypes.number,
      PropTypes.bool,
      PropTypes.string,
      PropTypes.func
    ].includes(propTypes[key])
  ) {
    return `(a.${key} === b.${key})`;
  }
  return `isEqualImpl(a.${key}, b.${key})`;
}

// Exports a function that compares a and b. `isEqualImpl` is a required
// third prop, as we can't otherwise access it.
module.exports = () =>
  eval(`
  function fastRGLPropsEqual(a, b, isEqualImpl) {
    if (a === b) return true;
    return (
      ${keys.map(getEqualType).join(" && ")}
    );
  }
  fastRGLPropsEqual;
`);
