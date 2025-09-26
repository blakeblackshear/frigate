const cloneDeep = require('lodash/cloneDeep')
const compare = require('json-schema-compare')
const computeLcm = require('compute-lcm')
const defaultsDeep = require('lodash/defaultsDeep')
const flatten = require('lodash/flatten')
const flattenDeep = require('lodash/flattenDeep')
const intersection = require('lodash/intersection')
const intersectionWith = require('lodash/intersectionWith')
const isEqual = require('lodash/isEqual')
const isPlainObject = require('lodash/isPlainObject')
const pullAll = require('lodash/pullAll')
const sortBy = require('lodash/sortBy')
const uniq = require('lodash/uniq')
const uniqWith = require('lodash/uniqWith')

const propertiesResolver = require('./complex-resolvers/properties')
const itemsResolver = require('./complex-resolvers/items')

const contains = (arr, val) => arr.indexOf(val) !== -1
const isSchema = (val) => isPlainObject(val) || val === true || val === false
const isFalse = (val) => val === false
const isTrue = (val) => val === true
const schemaResolver = (compacted, key, mergeSchemas) => mergeSchemas(compacted)
const stringArray = (values) => sortBy(uniq(flattenDeep(values)))
const notUndefined = (val) => val !== undefined
const allUniqueKeys = (arr) => uniq(flattenDeep(arr.map(keys)))

// resolvers
const first = compacted => compacted[0]
const required = compacted => stringArray(compacted)
const maximumValue = compacted => Math.max.apply(Math, compacted)
const minimumValue = compacted => Math.min.apply(Math, compacted)
const uniqueItems = compacted => compacted.some(isTrue)
const examples = compacted => uniqWith(flatten(compacted), isEqual)

function compareProp(key) {
  return function(a, b) {
    return compare({
      [key]: a
    }, { [key]: b })
  }
}

function getAllOf(schema) {
  let { allOf = [], ...copy } = schema
  copy = isPlainObject(schema) ? copy : schema // if schema is boolean
  return [copy, ...allOf.map(getAllOf)]
}

function getValues(schemas, key) {
  return schemas.map(schema => schema && schema[key])
}

function tryMergeSchemaGroups(schemaGroups, mergeSchemas) {
  return schemaGroups.map(function(schemas, index) {
    try {
      return mergeSchemas(schemas, index)
    } catch (e) {
      return undefined
    }
  }).filter(notUndefined)
}

function keys(obj) {
  if (isPlainObject(obj) || Array.isArray(obj)) {
    return Object.keys(obj)
  } else {
    return []
  }
}

function getAnyOfCombinations(arrOfArrays, combinations) {
  combinations = combinations || []
  if (!arrOfArrays.length) {
    return combinations
  }

  const values = arrOfArrays.slice(0).shift()
  const rest = arrOfArrays.slice(1)
  if (combinations.length) {
    return getAnyOfCombinations(rest, flatten(combinations.map(combination => values.map(item => ([item].concat(combination))))))
  }
  return getAnyOfCombinations(rest, values.map(item => (item)))
}

function throwIncompatible(values, paths) {
  let asJSON
  try {
    asJSON = values.map(function(val) {
      return JSON.stringify(val, null, 2)
    }).join('\n')
  } catch (variable) {
    asJSON = values.join(', ')
  }
  throw new Error('Could not resolve values for path:"' + paths.join('.') + '". They are probably incompatible. Values: \n' + asJSON)
}

function callGroupResolver(complexKeywords, resolverName, schemas, mergeSchemas, options, parents) {
  if (complexKeywords.length) {
    const resolverConfig = options.complexResolvers[resolverName]
    if (!resolverConfig || !resolverConfig.resolver) {
      throw new Error('No resolver found for ' + resolverName)
    }

    // extract all keywords from all the schemas that have one or more
    // then remove all undefined ones and not unique
    const extractedKeywordsOnly = schemas.map(schema => complexKeywords.reduce((all, key) => {
      if (schema[key] !== undefined) all[key] = schema[key]
      return all
    }, {}))
    const unique = uniqWith(extractedKeywordsOnly, compare)

    // create mergers that automatically add the path of the keyword for use in the complex resolver
    const mergers = resolverConfig.keywords.reduce((all, key) => ({
      ...all,
      [key]: (schemas, extraKey = []) => mergeSchemas(schemas, null, parents.concat(key, extraKey))
    }), {})

    const result = resolverConfig.resolver(unique, parents.concat(resolverName), mergers, options)

    if (!isPlainObject(result)) {
      throwIncompatible(unique, parents.concat(resolverName))
    }

    return result
  }
}

function createRequiredMetaArray(arr) {
  return { required: arr }
}

const schemaGroupProps = ['properties', 'patternProperties', 'definitions', 'dependencies']
const schemaArrays = ['anyOf', 'oneOf']
const schemaProps = [
  'additionalProperties',
  'additionalItems',
  'contains',
  'propertyNames',
  'not',
  'items'
]

const defaultResolvers = {
  type(compacted) {
    if (compacted.some(Array.isArray)) {
      const normalized = compacted.map(function(val) {
        return Array.isArray(val)
          ? val
          : [val]
      })
      const common = intersection.apply(null, normalized)

      if (common.length === 1) {
        return common[0]
      } else if (common.length > 1) {
        return uniq(common)
      }
    }
  },
  dependencies(compacted, paths, mergeSchemas) {
    const allChildren = allUniqueKeys(compacted)

    return allChildren.reduce(function(all, childKey) {
      const childSchemas = getValues(compacted, childKey)
      let innerCompacted = uniqWith(childSchemas.filter(notUndefined), isEqual)

      // to support dependencies
      const innerArrays = innerCompacted.filter(Array.isArray)

      if (innerArrays.length) {
        if (innerArrays.length === innerCompacted.length) {
          all[childKey] = stringArray(innerCompacted)
        } else {
          const innerSchemas = innerCompacted.filter(isSchema)
          const arrayMetaScheams = innerArrays.map(createRequiredMetaArray)
          all[childKey] = mergeSchemas(innerSchemas.concat(arrayMetaScheams), childKey)
        }
        return all
      }

      innerCompacted = uniqWith(innerCompacted, compare)

      all[childKey] = mergeSchemas(innerCompacted, childKey)
      return all
    }, {})
  },
  oneOf(compacted, paths, mergeSchemas) {
    const combinations = getAnyOfCombinations(cloneDeep(compacted))
    const result = tryMergeSchemaGroups(combinations, mergeSchemas)
    const unique = uniqWith(result, compare)

    if (unique.length) {
      return unique
    }
  },
  not(compacted) {
    return { anyOf: compacted }
  },
  pattern(compacted) {
    return compacted.map(r => '(?=' + r + ')').join('')
  },
  multipleOf(compacted) {
    let integers = compacted.slice(0)
    let factor = 1
    while (integers.some(n => !Number.isInteger(n))) {
      integers = integers.map(n => n * 10)
      factor = factor * 10
    }
    return computeLcm(integers) / factor
  },
  enum(compacted) {
    const enums = intersectionWith.apply(null, compacted.concat(isEqual))
    if (enums.length) {
      return sortBy(enums)
    }
  }
}

defaultResolvers.$id = first
defaultResolvers.$ref = first
defaultResolvers.$schema = first
defaultResolvers.additionalItems = schemaResolver
defaultResolvers.additionalProperties = schemaResolver
defaultResolvers.anyOf = defaultResolvers.oneOf
defaultResolvers.contains = schemaResolver
defaultResolvers.default = first
defaultResolvers.definitions = defaultResolvers.dependencies
defaultResolvers.description = first
defaultResolvers.examples = examples
defaultResolvers.exclusiveMaximum = minimumValue
defaultResolvers.exclusiveMinimum = maximumValue
defaultResolvers.items = itemsResolver
defaultResolvers.maximum = minimumValue
defaultResolvers.maxItems = minimumValue
defaultResolvers.maxLength = minimumValue
defaultResolvers.maxProperties = minimumValue
defaultResolvers.minimum = maximumValue
defaultResolvers.minItems = maximumValue
defaultResolvers.minLength = maximumValue
defaultResolvers.minProperties = maximumValue
defaultResolvers.properties = propertiesResolver
defaultResolvers.propertyNames = schemaResolver
defaultResolvers.required = required
defaultResolvers.title = first
defaultResolvers.uniqueItems = uniqueItems

const defaultComplexResolvers = {
  properties: propertiesResolver,
  items: itemsResolver
}

function merger(rootSchema, options, totalSchemas) {
  totalSchemas = totalSchemas || []
  options = defaultsDeep(options, {
    ignoreAdditionalProperties: false,
    resolvers: defaultResolvers,
    complexResolvers: defaultComplexResolvers,
    deep: true
  })

  const complexResolvers = Object.entries(options.complexResolvers)

  function mergeSchemas(schemas, base, parents) {
    schemas = cloneDeep(schemas.filter(notUndefined))
    parents = parents || []
    const merged = isPlainObject(base)
      ? base
      : {}

    // return undefined, an empty schema
    if (!schemas.length) {
      return
    }

    if (schemas.some(isFalse)) {
      return false
    }

    if (schemas.every(isTrue)) {
      return true
    }

    // there are no false and we don't need the true ones as they accept everything
    schemas = schemas.filter(isPlainObject)

    const allKeys = allUniqueKeys(schemas)
    if (options.deep && contains(allKeys, 'allOf')) {
      return merger({
        allOf: schemas
      }, options, totalSchemas)
    }

    const complexKeysArr = complexResolvers.map(([mainKeyWord, resolverConf]) =>
      allKeys.filter(k => resolverConf.keywords.includes(k)))

    // remove all complex keys before simple resolvers
    complexKeysArr.forEach(keys => pullAll(allKeys, keys))

    // call all simple resolvers for relevant keywords
    allKeys.forEach(function(key) {
      const values = getValues(schemas, key)
      const compacted = uniqWith(values.filter(notUndefined), compareProp(key))

      // arrayprops like anyOf and oneOf must be merged first, as they contains schemas
      // allOf is treated differently alltogether
      if (compacted.length === 1 && contains(schemaArrays, key)) {
        merged[key] = compacted[0].map(schema => mergeSchemas([schema], schema))
        // prop groups must always be resolved
      } else if (compacted.length === 1 && !contains(schemaGroupProps, key) && !contains(schemaProps, key)) {
        merged[key] = compacted[0]
      } else {
        const resolver = options.resolvers[key] || options.resolvers.defaultResolver
        if (!resolver) throw new Error('No resolver found for key ' + key + '. You can provide a resolver for this keyword in the options, or provide a default resolver.')

        const merger = (schemas, extraKey = []) => mergeSchemas(schemas, null, parents.concat(key, extraKey))
        merged[key] = resolver(compacted, parents.concat(key), merger, options)

        if (merged[key] === undefined) {
          throwIncompatible(compacted, parents.concat(key))
        } else if (merged[key] === undefined) {
          delete merged[key]
        }
      }
    })

    return complexResolvers.reduce((all, [resolverKeyword, config], index) => ({
      ...all,
      ...callGroupResolver(complexKeysArr[index], resolverKeyword, schemas, mergeSchemas, options, parents)
    }), merged)
  }

  const allSchemas = flattenDeep(getAllOf(rootSchema))
  const merged = mergeSchemas(allSchemas)

  return merged
}

merger.options = {
  resolvers: defaultResolvers
}

module.exports = merger
