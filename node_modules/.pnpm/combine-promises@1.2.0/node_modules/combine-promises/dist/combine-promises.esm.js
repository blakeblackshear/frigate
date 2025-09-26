function combinePromises(obj) {
  if (obj === null) {
    return Promise.reject(new Error('combinePromises does not handle null argument'));
  }

  if (typeof obj !== 'object') {
    return Promise.reject(new Error("combinePromises does not handle argument of type " + typeof obj));
  }

  var keys = Object.keys(obj); // not using async/await on purpose, otherwise lib outputs large _asyncToGenerator code in dist

  return Promise.all(Object.values(obj)).then(function (values) {
    var result = {};
    values.forEach(function (v, i) {
      result[keys[i]] = v;
    });
    return result;
  });
}

export default combinePromises;
//# sourceMappingURL=combine-promises.esm.js.map
