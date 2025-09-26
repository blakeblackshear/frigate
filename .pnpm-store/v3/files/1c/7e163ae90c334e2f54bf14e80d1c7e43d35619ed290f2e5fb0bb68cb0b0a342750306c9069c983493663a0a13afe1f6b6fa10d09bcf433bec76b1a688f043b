exports.nano = time => +time[0] * 1e9 + +time[1];

exports.scale = {
  'w': 6048e11,
  'd': 864e11,
  'h': 36e11,
  'm': 6e10,
  's': 1e9,
  'ms': 1e6,
  'μs': 1e3,
  'ns': 1,
};

exports.regex = {
 'w': /^(w((ee)?k)?s?)$/,
 'd': /^(d(ay)?s?)$/,
 'h': /^(h((ou)?r)?s?)$/,
 'm': /^(min(ute)?s?|m)$/,
 's': /^((sec(ond)?)s?|s)$/,
 'ms': /^(milli(second)?s?|ms)$/,
 'μs': /^(micro(second)?s?|μs)$/,
 'ns': /^(nano(second)?s?|ns?)$/,
};

exports.isSmallest = function(uom, unit) {
  return exports.regex[uom].test(unit);
};

exports.round = function(num, digits) {
  const n = Math.abs(num);
  return /[0-9]/.test(digits) ? n.toFixed(digits) : Math.round(n);
};
