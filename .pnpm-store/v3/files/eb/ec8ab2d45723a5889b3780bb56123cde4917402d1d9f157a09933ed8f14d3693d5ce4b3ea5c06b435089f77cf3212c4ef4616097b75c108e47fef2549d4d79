
const compare = require('json-schema-compare')
const forEach = require('lodash/forEach')
const {
  allUniqueKeys,
  deleteUndefinedProps,
  has,
  isSchema,
  notUndefined,
  uniqWith
} = require('../common')

function removeFalseSchemasFromArray(target) {
  forEach(target, function(schema, index) {
    if (schema === false) {
      target.splice(index, 1)
    }
  })
}

function getItemSchemas(subSchemas, key) {
  return subSchemas.map(function(sub) {
    if (!sub) {
      return undefined
    }

    if (Array.isArray(sub.items)) {
      const schemaAtPos = sub.items[key]
      if (isSchema(schemaAtPos)) {
        return schemaAtPos
      } else if (has(sub, 'additionalItems')) {
        return sub.additionalItems
      }
    } else {
      return sub.items
    }

    return undefined
  })
}

function getAdditionalSchemas(subSchemas) {
  return subSchemas.map(function(sub) {
    if (!sub) {
      return undefined
    }
    if (Array.isArray(sub.items)) {
      return sub.additionalItems
    }
    return sub.items
  })
}

// Provide source when array
function mergeItems(group, mergeSchemas, items) {
  const allKeys = allUniqueKeys(items)
  return allKeys.reduce(function(all, key) {
    const schemas = getItemSchemas(group, key)
    const compacted = uniqWith(schemas.filter(notUndefined), compare)
    all[key] = mergeSchemas(compacted, key)
    return all
  }, [])
}

module.exports = {
  keywords: ['items', 'additionalItems'],
  resolver(values, parents, mergers) {
    // const createSubMerger = groupKey => (schemas, key) => mergeSchemas(schemas, parents.concat(groupKey, key))
    const items = values.map(s => s.items)
    const itemsCompacted = items.filter(notUndefined)
    const returnObject = {}

    // if all items keyword values are schemas, we can merge them as simple schemas
    // if not we need to merge them as mixed
    if (itemsCompacted.every(isSchema)) {
      returnObject.items = mergers.items(items)
    } else {
      returnObject.items = mergeItems(values, mergers.items, items)
    }

    let schemasAtLastPos
    if (itemsCompacted.every(Array.isArray)) {
      schemasAtLastPos = values.map(s => s.additionalItems)
    } else if (itemsCompacted.some(Array.isArray)) {
      schemasAtLastPos = getAdditionalSchemas(values)
    }

    if (schemasAtLastPos) {
      returnObject.additionalItems = mergers.additionalItems(schemasAtLastPos)
    }

    if (returnObject.additionalItems === false && Array.isArray(returnObject.items)) {
      removeFalseSchemasFromArray(returnObject.items)
    }

    return deleteUndefinedProps(returnObject)
  }
}
