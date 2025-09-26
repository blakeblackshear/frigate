/* istanbul ignore file */
module.exports = {

  /**
       * Checks if `value` is an empty object, array or string.
       *
       * Objects are considered empty if they have no own enumerable string keyed
       * properties.
       *
       * Values such as strings, arrays are considered empty if they have a `length` of `0`.
       *
       * @param {*} value The value to check.
       * @returns {boolean} Returns `true` if `value` is empty, else `false`.
       * @example
       *
       * isEmpty(null)
       * // => true
       *
       * isEmpty(true)
       * // => true
       *
       * isEmpty(1)
       * // => true
       *
       * isEmpty([1, 2, 3])
       * // => false
       *
       * isEmpty('abc')
       * // => false
       *
       * isEmpty({ 'a': 1 })
       * // => false
       */
  isEmpty: function (value) {
    // eslint-disable-next-line lodash/prefer-is-nil
    if (value === null || value === undefined) {
      return true;
    }
    if (Array.isArray(value) || typeof value === 'string' || typeof value.splice === 'function') {
      return !value.length;
    }

    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        return false;
      }
    }

    return true;
  },

  /**
       * Checks if `value` is `undefined`.
       *
       * @param {*} value The value to check.
       * @returns {boolean} Returns `true` if `value` is `undefined`, else `false`.
       * @example
       *
       * isUndefined(void 0)
       * // => true
       *
       * isUndefined(null)
       * // => false
       */
  isUndefined: function (value) {
    return value === undefined;
  },

  /**
       * Checks if `func` is classified as a `Function` object.
       *
       * @param {*} func The value to check.
       * @returns {boolean} Returns `true` if `func` is a function, else `false`.
       * @example
       *
       * isFunction(self.isEmpty)
       * // => true
       *
       * isFunction(/abc/)
       * // => false
       */
  isFunction: function (func) {
    return typeof func === 'function';
  },

  /**
       * Converts the first character of `string` to upper case and the remaining
       * to lower case.
       *
       * @param {string} [string=''] The string to capitalize.
       * @returns {string} Returns the capitalized string.
       * @example
       *
       * capitalize('FRED')
       * // => 'Fred'
       *
       * capitalize('john')
       * // => 'John'
       */

  capitalize: function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  },

  /**
       * Reduces `array` to a value which is the accumulated result of running
       * each element in `array` thru `iteratee`, where each successive
       * invocation is supplied the return value of the previous. If `accumulator`
       * is not given, the first element of `array` is used as the initial
       * value. The iteratee is invoked with four arguments:
       * (accumulator, value, index|key, array).
       *
       * @param {Array} array The Array to iterate over.
       * @param {Function} iteratee The function invoked per iteration.
       * @param {*} [accumulator] The initial value.
       * @returns {*} Returns the accumulated value.
       * @example
       *
       * reduce([1, 2], (sum, n) => sum + n, 0)
       * // => 3
       *
       */
  reduce: function (array, iteratee, accumulator) {
    return array.reduce(iteratee, accumulator);
  },

  /**
       * Iterates over elements of `array`, returning an array of all elements
       * `predicate` returns truthy for. The predicate is invoked with three
       * arguments: (value, index, array).
       *
       * @param {Array} array The array to iterate over.
       * @param {Function|object} predicate The function/object invoked per iteration.
       * @returns {Array} Returns the new filtered array.
       * @example
       *
       * const users = [
          *   { 'user': 'barney', 'active': true },
          *   { 'user': 'fred',   'active': false }
          * ]
          *
          * filter(users, ({ active }) => active)
          * // => object for ['barney']
          */
  filter: function (array, predicate) {
    if (typeof predicate === 'function') {
      return array.filter(predicate);
    }
    var key = Object.keys(predicate),
      val = predicate[key],
      res = [];
    array.forEach(function (item) {
      if (item[key] && item[key] === val) {
        res.push(item);
      }
    });
    return res;
  },

  /**
       * The opposite of `filter` this method returns the elements of `array`
       * that `predicate` does **not** return truthy for.
       *
       * @param {Array} array collection to iterate over.
       * @param {String} predicate The String that needs to have truthy value, invoked per iteration.
       * @returns {Array} Returns the new filtered array.
       * @example
       *
       * const users = [
          *   { 'user': 'barney', 'active': true },
          *   { 'user': 'fred',   'active': false }
          * ]
          *
          * reject(users, 'active')
          * // => object for ['fred']
          */
  reject: function (array, predicate) {
    var res = [];
    array.forEach((object) => {
      if (!object[predicate]) {
        res.push(object);
      }
    });
    return res;
  },

  /**
       * Creates an array of values by running each element of `array` thru `iteratee`.
       * The iteratee is invoked with three arguments: (value, index, array).
       *
       * @param {Array} array The array to iterate over.
       * @param {Function} iteratee The function invoked per iteration.
       * @returns {Array} Returns the new mapped array.
       * @example
       *
       * function square(n) {
          *   return n * n
          * }
          *
          * map([4, 8], square)
          * // => [16, 64]
          */
  map: function (array, iteratee) {
    return array.map(iteratee);
  },

  /**
       * Iterates over elements of `collection` and invokes `iteratee` for each element.
       * The iteratee is invoked with three arguments: (value, index|key, collection).
       *
       * @param {Array|Object} collection The collection to iterate over.
       * @param {Function} iteratee The function invoked per iteration.
       * @returns {Array|Object} Returns `collection`.
       * @example
       *
       * forEach([1, 2], value => console.log(value))
       * // => Logs `1` then `2`.
       *
       * forEach({ 'a': 1, 'b': 2 }, (value, key) => console.log(key))
       * // => Logs 'a' then 'b'
       */

  forEach: function (collection, iteratee) {
    if (collection === null) {
      return null;
    }

    if (Array.isArray(collection)) {
      return collection.forEach(iteratee);
    }
    const iterable = Object(collection),
      props = Object.keys(collection);
    var index = -1,
      key, i;

    for (i = 0; i < props.length; i++) {
      key = props[++index];
      iteratee(iterable[key], key, iterable);
    }
    return collection;
  },

  /**
       * Checks if `value` is in `collection`. If `collection` is a string, it's
       * checked for a substring of `value`, otherwise it checks if the `value` is present
       * as a key in a `collection` object.
       *
       * @param {Array|Object|string} collection The collection to inspect.
       * @param {*} value The value to search for.
       * @returns {boolean} Returns `true` if `value` is found, else `false`.
       * @example
       *
       * _.includes([1, 2, 3], 1);
       * // => true
       *
       * _.includes({ 'a': 1, 'b': 2 }, 1);
       * // => true
       *
       * _.includes('abcd', 'bc');
       * // => true
       */
  includes: function (collection, value) {
    if (Array.isArray(collection) || typeof collection === 'string') {
      return collection.includes(value);
    }
    for (var key in collection) {
      if (collection.hasOwnProperty(key)) {
        if (collection[key] === value) {
          return true;
        }
      }
    }
    return false;
  },

  /**
       * Gets the size of `collection` by returning its length for array and strings.
       * For objects it returns the number of enumerable string keyed
       * properties.
       *
       * @param {Array|Object|string} collection The collection to inspect.
       * @returns {number} Returns the collection size.
       * @example
       *
       * size([1, 2, 3])
       * // => 3
       *
       * size({ 'a': 1, 'b': 2 })
       * // => 2
       *
       * size('pebbles')
       * // => 7
       */
  size: function (collection) {
    // eslint-disable-next-line lodash/prefer-is-nil
    if (collection === null || collection === undefined) {
      return 0;
    }
    if (Array.isArray(collection) || typeof collection === 'string') {
      return collection.length;
    }

    return Object.keys(collection).length;
  },

  /**
       * Converts all elements in `array` into a string separated by `separator`.
       *
       * @param {Array} array The array to convert.
       * @param {string} [separator=','] The element separator.
       * @returns {string} Returns the joined string.
       * @example
       *
       * _.join(['a', 'b', 'c'], '~');
       * // => 'a~b~c'
       */
  join: function (array, separator) {
    if (array === null) {
      return '';
    }
    return array.join(separator);
  },

  /**
       * Removes trailing whitespace or specified characters from `string`.
       *
       * @param {string} [string=''] The string to trim.
       * @param {string} [chars=whitespace] The characters to trim.
       * @returns {string} Returns the trimmed string.
       * @example
       *
       * trimEnd('  abc  ')
       * // => '  abc'
       *
       * trimEnd('-_-abc-_-', '_-')
       * // => '-_-abc'
       */
  trimEnd: function (string, chars) {
    if (!string) {
      return '';
    }
    if (string && !chars) {
      return string.replace(/\s*$/, '');
    }
    chars += '$';
    return string.replace(new RegExp(chars, 'g'), '');
  },

  /**
       * Returns the index of the first
       * element `predicate` returns truthy for.
       *
       * @param {Array} array The array to inspect.
       * @param {Object} predicate The exact object to be searched for in the array.
       * @returns {number} Returns the index of the found element, else `-1`.
       * @example
       *
       * var users = [
          *   { 'user': 'barney',  'active': false },
          *   { 'user': 'fred',    'active': false },
          *   { 'user': 'pebbles', 'active': true }
          * ];
          *
          * _.findIndex(users, { 'user': 'fred', 'active': false });
          * // => 1
          *
          * _.findIndex(users, {'active' : false});
          * // => 0
          *
          */
  findIndex: function (array, predicate) {
    var length = array === null ? 0 : array.length,
      index = -1,
      keys = Object.keys(predicate),
      found, i;
    if (!length) {
      return -1;
    }
    for (i = 0; i < array.length; i++) {
      found = true;
      // eslint-disable-next-line no-loop-func
      keys.forEach((key) => {
        if (!(array[i][key] && array[i][key] === predicate[key])) {
          found = false;
        }
      });
      if (found) {
        index = i;
        break;
      }
    }
    return index;
  },

  /**
       * Gets the value at `path` of `object`. If the resolved value is
       * `undefined`, the `defaultValue` is returned in its place.
       *
       * @param {Object} object The object to query.
       * @param {string} path The path of the property to get.
       * @param {*} [defaultValue] The value returned for `undefined` resolved values.
       * @returns {*} Returns the resolved value.
       * @example
       *
       * const object = { a: {b : 'c'} }
       *
       *
       * get(object, 'a.b.c', 'default')
       * // => 'default'
       *
       * get(object, 'a.b', 'default')
       * // => 'c'
       */
  get: function (object, path, defaultValue) {
    if (object === null) {
      return undefined;
    }
    var arr = path.split('.'),
      res = object,
      i;
    for (i = 0; i < arr.length; i++) {
      res = res[arr[i]];
      if (res === undefined) {
        return defaultValue;
      }
    }
    return res;
  },

  /**
       * Checks if `predicate` returns truthy for **all** elements of `array`.
       * Iteration is stopped once `predicate` returns falsey. The predicate is
       * invoked with three arguments: (value, index, array).
       *
       * @param {Array} array The array to iterate over.
       * @param {Function} predicate The function invoked per iteration.
       * @returns {boolean} Returns `true` if all elements pass the predicate check,
       *  else `false`.
       * @example
       *
       * every([true, 1, null, 'yes'], Boolean)
       * // => false
       */
  every: function (array, predicate) {
    var index = -1,
      length = array === null ? 0 : array.length;

    while (++index < length) {
      if (!predicate(array[index], index, array)) {
        return false;
      }
    }
    return true;
  }

};
