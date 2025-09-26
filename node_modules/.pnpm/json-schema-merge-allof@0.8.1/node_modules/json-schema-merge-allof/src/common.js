const flatten = require('lodash/flatten')
const flattenDeep = require('lodash/flattenDeep')
const isPlainObject = require('lodash/isPlainObject')
const uniq = require('lodash/uniq')
const uniqWith = require('lodash/uniqWith')
const without = require('lodash/without')

function deleteUndefinedProps(returnObject) {
  // cleanup empty
  for (const prop in returnObject) {
    if (has(returnObject, prop) && isEmptySchema(returnObject[prop])) {
      delete returnObject[prop]
    }
  }
  return returnObject
}

const allUniqueKeys = (arr) => uniq(flattenDeep(arr.map(keys)))
const getValues = (schemas, key) => schemas.map(schema => schema && schema[key])
const has = (obj, propName) => Object.prototype.hasOwnProperty.call(obj, propName)
const keys = obj => {
  if (isPlainObject(obj) || Array.isArray(obj)) {
    return Object.keys(obj)
  } else {
    return []
  }
}

const notUndefined = (val) => val !== undefined
const isSchema = (val) => isPlainObject(val) || val === true || val === false
const isEmptySchema = (obj) => (!keys(obj).length) && obj !== false && obj !== true
const withoutArr = (arr, ...rest) => without.apply(null, [arr].concat(flatten(rest)))

module.exports = {
  allUniqueKeys,
  deleteUndefinedProps,
  getValues,
  has,
  isEmptySchema,
  isSchema,
  keys,
  notUndefined,
  uniqWith,
  withoutArr
}
