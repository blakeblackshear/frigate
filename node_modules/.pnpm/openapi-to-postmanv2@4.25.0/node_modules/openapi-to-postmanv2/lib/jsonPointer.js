const slashes = /\//g,
  tildes = /~/g,
  escapedSlash = /~1/g,
  escapedSlashString = '~1',
  localPointer = '#',
  httpSeparator = 'http',
  escapedTilde = /~0/g,
  jsonPointerLevelSeparator = '/',
  escapedTildeString = '~0',
  { isSwagger, getBundleRulesDataByVersion } = require('./common/versionUtils'),
  {
    resolveFirstLevelChild,
    resolveSecondLevelChild
  } = require('./bundleRules/resolvers');

/**
* Encodes a filepath name so it can be a json pointer
* replaces tildes and slashes for ~0 and ~1
* @param {string} filePathName the filePathName of the file
* @returns {string} - the encoded filepath
*/
function jsonPointerEncodeAndReplace(filePathName) {
  return encodeURIComponent(filePathName.replace(tildes, escapedTildeString).replace(slashes, escapedSlashString));
}

/**
* Decodes a json pointer
* replaces ~0 and ~1 for tildes and slashes
* @param {string} filePathName the filePathName of the file
* @returns {string} - the encoded filepath
*/
function jsonPointerDecodeAndReplace(filePathName) {
  return decodeURIComponent(filePathName.replace(escapedSlash, jsonPointerLevelSeparator).replace(escapedTilde, '~'));
}

/**
 * Get a path and return a valid key name in openapi spec
 * @param {string} filePathName - The filePath from the ref called
 * @param {string} hash - A calculated hash to join with the resultant generatedName
 * @returns {string} A valid in openapi object name
 */
function generateObjectName(filePathName, hash = '') {
  let decodedRef = jsonPointerDecodeAndReplace(filePathName),
    validName = decodedRef.replace(/\//g, '_').replace(/#/g, '-'),
    hashPart = hash ? `_${hash}` : '';
  validName = `${validName.replace(/[^a-zA-Z0-9\.\-_]/g, '')}${hashPart}`;
  return validName;
}

/**
* returns the key that the object in components will have could be nested
* @param {string} traceFromParent the node trace from root.
* @param {string} mainKey - The generated mainKey for the components
* @param {string} version - The current spec version
* @param {string} commonPathFromData - The common path in the file's paths
* @param {string} parentNodeKey - The parent key before the trace
* @returns {Array} - the calculated keys in an array representing each nesting property name
*/
function getKeyInComponents(traceFromParent, mainKey, version, commonPathFromData, parentNodeKey = undefined) {
  const {
    CONTAINERS,
    DEFINITIONS,
    COMPONENTS_KEYS,
    INLINE,
    ROOT_CONTAINERS_KEYS
  } = getBundleRulesDataByVersion(version);
  let result,
    newFPN = mainKey.replace(generateObjectName(commonPathFromData), ''),
    trace = [
      ...traceFromParent,
      jsonPointerDecodeAndReplace(newFPN)
    ].reverse(),
    traceToKey = [],
    matchFound = false,
    hasNotParent = parentNodeKey === undefined,
    isRootAndReusableItemsContainer = ROOT_CONTAINERS_KEYS.includes(traceFromParent[0]),
    isAComponentKeyReferenced = COMPONENTS_KEYS.includes(traceFromParent[0]) && hasNotParent;

  if (isRootAndReusableItemsContainer || isAComponentKeyReferenced) {
    return [];
  }

  for (let [index, item] of trace.entries()) {
    let itemShouldBeResolvedInline = INLINE.includes(item);

    if (itemShouldBeResolvedInline) {
      matchFound = false;
      break;
    }
    item = resolveFirstLevelChild(item, CONTAINERS);
    resolveSecondLevelChild(trace, index, DEFINITIONS);
    traceToKey.push(item.replace(/\s/g, ''));
    if (COMPONENTS_KEYS.includes(item)) {
      matchFound = true;
      break;
    }
  }
  result = matchFound ?
    traceToKey.reverse() :
    [];
  return result;
}

/**
* concats the inputs to generate the json pointer
* @constructor
* @param {string} traceFromParent the trace from parent.
* @param {string} targetInRoot - The root element where we will point
* @returns {string} - the concatenated json pointer
*/
function concatJsonPointer(traceFromParent, targetInRoot) {
  const traceFromParentAsString = traceFromParent.join(jsonPointerLevelSeparator);
  return localPointer + targetInRoot + jsonPointerLevelSeparator + traceFromParentAsString;
}

/**
* genereates the json pointer relative to the root
* @constructor
* @param {string} refValue the type of component e.g. schemas, parameters, etc.
* @param {string} traceFromKey the trace from the parent node.
* @param {string} version - The version we are working on
* @returns {string} - the concatenated json pointer
*/
function getJsonPointerRelationToRoot(refValue, traceFromKey, version) {
  let targetInRoot = isSwagger(version) ? '' : '/components';
  if (refValue.startsWith(localPointer)) {
    return refValue;
  }
  return concatJsonPointer(traceFromKey, targetInRoot);
}

/**
   * Checks if the input value is a valid url
   * @param {string} stringToCheck - specified version of the process
   * @returns {object} - Detect root files result object
   */
function stringIsAValidUrl(stringToCheck) {
  try {
    let url = new URL(stringToCheck);
    if (url) {
      return true;
    }
    return false;
  }
  catch (err) {
    try {
      var url = require('url');
      let urlObj = url.parse(stringToCheck);
      return urlObj.hostname !== null;
    }
    catch (parseErr) {
      return false;
    }
  }
}

/**
   * Determines if a value of a given key property of an object
   * is an external reference with key $ref and value that does not start with #
   * @param {object} obj - parent object of the $ref property
   * @param {string} key - property key to check
   * @returns {boolean} - true if the property key is $ref and the value does not start with #
   * otherwise false
   */
function isExtRef(obj, key) {
  return key === '$ref' &&
    typeof obj[key] === 'string' &&
    obj[key] !== undefined &&
    !obj[key].startsWith(localPointer) &&
    !stringIsAValidUrl(obj[key]);
}

/**
   * Determines if a value of a given key property of an object
   * is an external reference with key $ref and value that does not start with #
   * @param {object} obj - parent object of the $ref property
   * @param {string} key - property key to check
   * @returns {boolean} - true if the property key is $ref and the value does not start with #
   * otherwise false
   */
function isExtURLRef(obj, key) {
  return key === '$ref' &&
    typeof obj[key] === 'string' &&
    obj[key] !== undefined &&
    !obj[key].startsWith(localPointer) &&
    stringIsAValidUrl(obj[key]);
}


/**
   * Determines if a value of a given key property of an object
   * is an external reference with key $ref and value that does not start with #
   * @param {object} obj - parent object of the $ref property
   * @param {string} key - property key to check
   * @returns {boolean} - true if the property key is $ref and the value does not start with #
   * otherwise false
   */
function isExtRemoteRef(obj, key) {
  return isExtRef(obj, key) || isExtURLRef(obj, key);
}

/**
   * Removes the local pointer inside a path
   * aab.yaml#component returns aab.yaml
   * @param {string} refValue - value of the $ref property
   * @returns {string} - the calculated path only
   */
function removeLocalReferenceFromPath(refValue) {
  if (refValue.$ref.includes(localPointer)) {
    return refValue.$ref.split(localPointer)[0];
  }
  return refValue.$ref;
}

/**
   * Determines if a value of a given key property of an object
   * is a local reference with key $ref and value that starts with #
   * @param {object} obj - parent object of the $ref property
   * @param {string} key - property key to check
   * @returns {boolean} - true if the property key is $ref and the value starts with #
   * otherwise false
   */
function isLocalRef(obj, key) {
  return key === '$ref' &&
    typeof obj[key] === 'string' &&
    obj[key] !== undefined &&
    obj[key].startsWith(localPointer);
}

/**
   * Determines if a value of a given key property of an object
   * is a remote reference with key $ref and value that is a valid url
   * @param {object} obj - parent object of the $ref property
   * @param {string} key - property key to check
   * @returns {boolean} - true if the property key is $ref and the value is a valid url
   * otherwise false
   */
function isRemoteRef(obj, key) {
  return key === '$ref' &&
  typeof obj[key] === 'string' &&
  obj[key] !== undefined &&
  !obj[key].startsWith(localPointer) &&
  stringIsAValidUrl(obj[key]);
}

/**
   * Extracts the entity's name from the json pointer
   * @param {string} jsonPointer - pointer to get the name from
   * @returns {boolean} - string: the name of the entity
   */
function getEntityName(jsonPointer) {
  if (!jsonPointer) {
    return '';
  }
  let segment = jsonPointer.substring(jsonPointer.lastIndexOf(jsonPointerLevelSeparator) + 1);
  return segment;
}

module.exports = {
  jsonPointerEncodeAndReplace,
  jsonPointerDecodeAndReplace,
  getJsonPointerRelationToRoot,
  concatJsonPointer,
  getKeyInComponents,
  isExtRef,
  isExtURLRef,
  isExtRemoteRef,
  removeLocalReferenceFromPath,
  isLocalRef,
  getEntityName,
  isRemoteRef,
  localPointer,
  httpSeparator,
  jsonPointerLevelSeparator,
  generateObjectName,
  stringIsAValidUrl
};
