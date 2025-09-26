
const compare = require('json-schema-compare')
const forEach = require('lodash/forEach')
const {
  allUniqueKeys,
  deleteUndefinedProps,
  getValues,
  keys,
  notUndefined,
  uniqWith,
  withoutArr
} = require('../common')

function removeFalseSchemas(target) {
  forEach(target, function(schema, prop) {
    if (schema === false) {
      delete target[prop]
    }
  })
}

function mergeSchemaGroup(group, mergeSchemas) {
  const allKeys = allUniqueKeys(group)
  return allKeys.reduce(function(all, key) {
    const schemas = getValues(group, key)
    const compacted = uniqWith(schemas.filter(notUndefined), compare)
    all[key] = mergeSchemas(compacted, key)
    return all
  }, {})
}

module.exports = {
  keywords: ['properties', 'patternProperties', 'additionalProperties'],
  resolver(values, parents, mergers, options) {
    // first get rid of all non permitted properties
    if (!options.ignoreAdditionalProperties) {
      values.forEach(function(subSchema) {
        const otherSubSchemas = values.filter(s => s !== subSchema)
        const ownKeys = keys(subSchema.properties)
        const ownPatternKeys = keys(subSchema.patternProperties)
        const ownPatterns = ownPatternKeys.map(k => new RegExp(k))
        otherSubSchemas.forEach(function(other) {
          const allOtherKeys = keys(other.properties)
          const keysMatchingPattern = allOtherKeys.filter(k => ownPatterns.some(pk => pk.test(k)))
          const additionalKeys = withoutArr(allOtherKeys, ownKeys, keysMatchingPattern)
          additionalKeys.forEach(function(key) {
            other.properties[key] = mergers.properties([
              other.properties[key], subSchema.additionalProperties
            ], key)
          })
        })
      })

      // remove disallowed patternProperties
      values.forEach(function(subSchema) {
        const otherSubSchemas = values.filter(s => s !== subSchema)
        const ownPatternKeys = keys(subSchema.patternProperties)
        if (subSchema.additionalProperties === false) {
          otherSubSchemas.forEach(function(other) {
            const allOtherPatterns = keys(other.patternProperties)
            const additionalPatternKeys = withoutArr(allOtherPatterns, ownPatternKeys)
            additionalPatternKeys.forEach(key => delete other.patternProperties[key])
          })
        }
      })
    }

    const returnObject = {
      additionalProperties: mergers.additionalProperties(values.map(s => s.additionalProperties)),
      patternProperties: mergeSchemaGroup(values.map(s => s.patternProperties), mergers.patternProperties),
      properties: mergeSchemaGroup(values.map(s => s.properties), mergers.properties)
    }

    if (returnObject.additionalProperties === false) {
      removeFalseSchemas(returnObject.properties)
    }

    return deleteUndefinedProps(returnObject)
  }
}
