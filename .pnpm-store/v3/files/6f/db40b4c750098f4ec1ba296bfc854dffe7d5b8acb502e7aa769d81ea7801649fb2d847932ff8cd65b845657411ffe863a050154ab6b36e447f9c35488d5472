var isEqual = require('lodash/isEqual')
var sortBy = require('lodash/sortBy')
var uniq = require('lodash/uniq')
var uniqWith = require('lodash/uniqWith')
var defaults = require('lodash/defaults')
var intersectionWith = require('lodash/intersectionWith')
var isPlainObject = require('lodash/isPlainObject')
var isBoolean = require('lodash/isBoolean')

var normalizeArray = val => Array.isArray(val)
  ? val : [val]
var undef = val => val === undefined
var keys = obj => isPlainObject(obj) || Array.isArray(obj) ? Object.keys(obj) : []
var has = (obj, key) => obj.hasOwnProperty(key)
var stringArray = arr => sortBy(uniq(arr))
var undefEmpty = val => undef(val) || (Array.isArray(val) && val.length === 0)
var keyValEqual = (a, b, key, compare) => b && has(b, key) && a && has(a, key) && compare(a[key], b[key])
var undefAndZero = (a, b) => (undef(a) && b === 0) || (undef(b) && a === 0) || isEqual(a, b)
var falseUndefined = (a, b) => (undef(a) && b === false) || (undef(b) && a === false) || isEqual(a, b)
var emptySchema = schema => undef(schema) || isEqual(schema, {}) || schema === true
var emptyObjUndef = schema => undef(schema) || isEqual(schema, {})
var isSchema = val => undef(val) || isPlainObject(val) || val === true || val === false

function undefArrayEqual(a, b) {
  if (undefEmpty(a) && undefEmpty(b)) {
    return true
  } else {
    return isEqual(stringArray(a), stringArray(b))
  }
}

function unsortedNormalizedArray(a, b) {
  a = normalizeArray(a)
  b = normalizeArray(b)
  return isEqual(stringArray(a), stringArray(b))
}

function schemaGroup(a, b, key, compare) {
  var allProps = uniq(keys(a).concat(keys(b)))
  if (emptyObjUndef(a) && emptyObjUndef(b)) {
    return true
  } else if (emptyObjUndef(a) && keys(b).length) {
    return false
  } else if (emptyObjUndef(b) && keys(a).length) {
    return false
  }

  return allProps.every(function(key) {
    var aVal = a[key]
    var bVal = b[key]
    if (Array.isArray(aVal) && Array.isArray(bVal)) {
      return isEqual(stringArray(a), stringArray(b))
    } else if (Array.isArray(aVal) && !Array.isArray(bVal)) {
      return false
    } else if (Array.isArray(bVal) && !Array.isArray(aVal)) {
      return false
    }
    return keyValEqual(a, b, key, compare)
  })
}

function items(a, b, key, compare) {
  if (isPlainObject(a) && isPlainObject(b)) {
    return compare(a, b)
  } else if (Array.isArray(a) && Array.isArray(b)) {
    return schemaGroup(a, b, key, compare)
  } else {
    return isEqual(a, b)
  }
}

function unsortedArray(a, b, key, compare) {
  var uniqueA = uniqWith(a, compare)
  var uniqueB = uniqWith(b, compare)
  var inter = intersectionWith(uniqueA, uniqueB, compare)
  return inter.length === Math.max(uniqueA.length, uniqueB.length)
}

var comparers = {
  title: isEqual,
  uniqueItems: falseUndefined,
  minLength: undefAndZero,
  minItems: undefAndZero,
  minProperties: undefAndZero,
  required: undefArrayEqual,
  enum: undefArrayEqual,
  type: unsortedNormalizedArray,
  items: items,
  anyOf: unsortedArray,
  allOf: unsortedArray,
  oneOf: unsortedArray,
  properties: schemaGroup,
  patternProperties: schemaGroup,
  dependencies: schemaGroup
}

var acceptsUndefined = [
  'properties',
  'patternProperties',
  'dependencies',
  'uniqueItems',
  'minLength',
  'minItems',
  'minProperties',
  'required'
]

var schemaProps = ['additionalProperties', 'additionalItems', 'contains', 'propertyNames', 'not']

function compare(a, b, options) {
  options = defaults(options, {
    ignore: []
  })

  if (emptySchema(a) && emptySchema(b)) {
    return true
  }

  if (!isSchema(a) || !isSchema(b)) {
    throw new Error('Either of the values are not a JSON schema.')
  }
  if (a === b) {
    return true
  }

  if (isBoolean(a) && isBoolean(b)) {
    return a === b
  }

  if ((a === undefined && b === false) || (b === undefined && a === false)) {
    return false
  }

  if ((undef(a) && !undef(b)) || (!undef(a) && undef(b))) {
    return false
  }

  var allKeys = uniq(Object.keys(a).concat(Object.keys(b)))

  if (options.ignore.length) {
    allKeys = allKeys.filter(k => options.ignore.indexOf(k) === -1)
  }

  if (!allKeys.length) {
    return true
  }

  function innerCompare(a, b) {
    return compare(a, b, options)
  }

  return allKeys.every(function(key) {
    var aValue = a[key]
    var bValue = b[key]

    if (schemaProps.indexOf(key) !== -1) {
      return compare(aValue, bValue, options)
    }

    var comparer = comparers[key]
    if (!comparer) {
      comparer = isEqual
    }

    // do simple lodash check first
    if (isEqual(aValue, bValue)) {
      return true
    }

    if (acceptsUndefined.indexOf(key) === -1) {
      if ((!has(a, key) && has(b, key)) || (has(a, key) && !has(b, key))) {
        return aValue === bValue
      }
    }

    var result = comparer(aValue, bValue, key, innerCompare)
    if (!isBoolean(result)) {
      throw new Error('Comparer must return true or false')
    }
    return result
  })
}

module.exports = compare
