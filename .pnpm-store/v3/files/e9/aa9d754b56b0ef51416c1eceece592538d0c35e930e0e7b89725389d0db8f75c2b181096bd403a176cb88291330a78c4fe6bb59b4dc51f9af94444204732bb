const _ = require('lodash');

/**
 * Checks if value is postman variable or not
 *
 * @param {*} value - Value to check for
 * @returns {Boolean} postman variable or not
 */
function isPmVariable (value) {
  // collection/environment variables are in format - {{var}}
  return _.isString(value) && _.startsWith(value, '{{') && _.endsWith(value, '}}');
}

/**
 * Takes in the postman path and the schema path
 * takes from the path the number of segments present in the schema path
 * and returns the last segments from the path to match in an string format
 *
 * @param {string} pathToMatch - parsed path (exclude host and params) from the Postman request
 * @param {string} schemaPath - schema path from the OAS spec (exclude servers object)
 * @returns {string} only the selected segments from the pathToMatch
 */
function handleExplicitServersPathToMatch (pathToMatch, schemaPath) {
  let pathTMatchSlice,
    schemaPathArr = _.reject(schemaPath.split('/'), (segment) => {
      return segment === '';
    }),
    schemaPathSegments = schemaPathArr.length,
    pathToMatchArr = _.reject(pathToMatch.split('/'), (segment) => {
      return segment === '';
    }),
    pathToMatchSegments = pathToMatchArr.length;
  if (pathToMatchSegments < schemaPathSegments) {
    return pathToMatch;
  }
  pathTMatchSlice = pathToMatchArr.slice(pathToMatchArr.length - schemaPathSegments, pathToMatchArr.length);
  return pathTMatchSlice.join('/');
}

/**
 * Finds fixed parts present in path segment of collection or schema.
 *
 * @param {String} segment - Path segment
 * @param {String} pathType - Path type (one of 'collection' / 'schema')
 * @returns {Array} - Array of strings where each element is fixed part in order of their occurence
 */
function getFixedPartsFromPathSegment (segment, pathType = 'collection') {
  var tempSegment = segment,
    // collection is default
    varMatches = segment.match(pathType === 'schema' ? /(\{[^\/\{\}]+\})/g : /(\{\{[^\/\{\}]+\}\})/g),
    fixedParts = [];

  _.forEach(varMatches, (match) => {
    let matchedIndex = tempSegment.indexOf(match);

    // push fixed part before collection variable if present
    (matchedIndex !== 0) && (fixedParts.push(tempSegment.slice(0, matchedIndex)));

    // substract starting fixed and variable part from tempSegment
    tempSegment = tempSegment.substr(matchedIndex + match.length);
  });

  // add last fixed part if present
  (tempSegment.length > 0) && (fixedParts.push(tempSegment));

  return fixedParts;
}

/**
 * @param {*} pmSuffix - Collection request's path suffix array
 * @param {*} schemaPath - schema operation's path suffix array
 * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
 * @returns {*} score - null of no match, int for match. higher value indicates better match
 * You get points for the number of URL segments that match
 * You are penalized for the number of schemaPath segments that you skipped
 */
function getPostmanUrlSuffixSchemaScore (pmSuffix, schemaPath, options) {
  let mismatchFound = false,
    variables = [],
    minLength = Math.min(pmSuffix.length, schemaPath.length),
    sMax = schemaPath.length - 1,
    pMax = pmSuffix.length - 1,
    matchedSegments = 0,
    // No. of fixed segment matches between schema and postman url path
    fixedMatchedSegments = 0,
    // No. of variable segment matches between schema and postman url path
    variableMatchedSegments = 0,
    // checks if schema segment provided is path variable
    isSchemaSegmentPathVar = (segment) => {
      return segment.startsWith('{') &&
      segment.endsWith('}') &&
      // check that only one path variable is present as collection path variable can contain only one var
      segment.indexOf('}') === segment.lastIndexOf('}');
    };

  if (options.strictRequestMatching && pmSuffix.length !== schemaPath.length) {
    return {
      match: false,
      score: null,
      pathVars: []
    };
  }

  // start from the last segment of both
  // segments match if the schemaPath segment is {..} or the postmanPathStr is :<anything> or {{anything}}
  for (let i = 0; i < minLength; i++) {
    let schemaFixedParts = getFixedPartsFromPathSegment(schemaPath[sMax - i], 'schema'),
      collectionFixedParts = getFixedPartsFromPathSegment(pmSuffix[pMax - i], 'collection');

    if (
      (_.isEqual(schemaFixedParts, collectionFixedParts)) || // exact fixed parts match
      (isSchemaSegmentPathVar(schemaPath[sMax - i])) || // schema segment is a pathVar
      (pmSuffix[pMax - i].startsWith(':')) || // postman segment is a pathVar
      (isPmVariable(pmSuffix[pMax - i])) // postman segment is an env/collection var
    ) {

      // for variable match increase variable matched segments count (used for determining order for multiple matches)
      if (
        (isSchemaSegmentPathVar(schemaPath[sMax - i])) && // schema segment is a pathVar
        ((pmSuffix[pMax - i].startsWith(':')) || // postman segment is a pathVar
          (isPmVariable(pmSuffix[pMax - i]))) // postman segment is an env/collection var
      ) {
        variableMatchedSegments++;
      }
      // for exact match increase fix matched segments count (used for determining order for multiple matches)
      else if (_.isEqual(schemaFixedParts, collectionFixedParts)) {
        fixedMatchedSegments++;
      }

      // add a matched path variable only if the schema one was a pathVar and only one path variable is in segment
      if (isSchemaSegmentPathVar(schemaPath[sMax - i])) {
        variables.push({
          key: schemaPath[sMax - i].substring(1, schemaPath[sMax - i].length - 1),
          value: pmSuffix[pMax - i]
        });
      }
      matchedSegments++;
    }
    else {
      // there was one segment for which there was no mismatch
      mismatchFound = true;
      break;
    }
  }

  if (!mismatchFound) {
    return {
      match: true,
      // schemaPath endsWith postman path suffix
      // score is length of the postman path array + schema array - length difference
      // the assumption is that a longer path matching a longer path is a higher score, with
      // penalty for any length difference
      // schemaPath will always be > postmanPathSuffix because SchemaPath ands with pps
      score: ((2 * matchedSegments) / (schemaPath.length + pmSuffix.length)),
      fixedMatchedSegments,
      variableMatchedSegments,
      pathVars: _.reverse(variables) // keep index in order of left to right
    };
  }
  return {
    match: false,
    score: null,
    pathVars: []
  };
}

/**
 * @param {string} postmanPath - parsed path (exclude host and params) from the Postman request
 * @param {string} schemaPath - schema path from the OAS spec (exclude servers object)
 * @param {object} options - a standard list of options that's globally passed around. Check options.js for more.
 * @returns {*} score + match + pathVars - higher score - better match. null - no match
 */
function getPostmanUrlSchemaMatchScore (postmanPath, schemaPath, options) {
  var postmanPathArr = _.reject(postmanPath.split('/'), (segment) => {
      return segment === '';
    }),
    schemaPathArr = _.reject(schemaPath.split('/'), (segment) => {
      return segment === '';
    }),
    matchedPathVars = null,
    maxScoreFound = -Infinity,
    anyMatchFound = false,
    fixedMatchedSegments,
    variableMatchedSegments,
    postmanPathSuffixes = [];

  // get array with all suffixes of postmanPath
  // if postmanPath = {{url}}/a/b, the suffix array is [ [{{url}}, a, b] , [a, b] , [b]]
  for (let i = postmanPathArr.length; i > 0; i--) {
    // i will be 3, 2, 1
    postmanPathSuffixes.push(postmanPathArr.slice(-i));

    break; // we only want one item in the suffixes array for now
  }

  // for each suffx, calculate score against the schemaPath
  // the schema<>postman score is the sum
  _.each(postmanPathSuffixes, (pps) => {
    let suffixMatchResult = getPostmanUrlSuffixSchemaScore(pps, schemaPathArr, options);
    if (suffixMatchResult.match && suffixMatchResult.score > maxScoreFound) {
      maxScoreFound = suffixMatchResult.score;
      matchedPathVars = suffixMatchResult.pathVars;
      // No. of fixed segment matches between schema and postman url path
      fixedMatchedSegments = suffixMatchResult.fixedMatchedSegments;
      // No. of variable segment matches between schema and postman url path
      variableMatchedSegments = suffixMatchResult.variableMatchedSegments;
      anyMatchFound = true;
    }
  });

  // handle root path '/'
  if (postmanPath === '/' && schemaPath === '/') {
    anyMatchFound = true;
    maxScoreFound = 1; // assign max possible score
    matchedPathVars = []; // no path variables present
    fixedMatchedSegments = 0;
    variableMatchedSegments = 0;
  }

  if (anyMatchFound) {
    return {
      match: true,
      score: maxScoreFound,
      pathVars: matchedPathVars,
      fixedMatchedSegments,
      variableMatchedSegments
    };
  }
  return {
    match: false
  };
}

module.exports = {
  /**
   * Finds matching endpoint from definition corresponding to request/transaction.
   *
   * @param {*} method - Request method
   * @param {*} url - Request URL
   * @param {*} schema - OAS definition object
   * @param {*} options - a standard list of options that's globally passed around. Check options.js for more.
   * @returns {Array} - Array of matched definition endpoints
   */
  findMatchingRequestFromSchema: function (method, url, schema, options) {
    // first step - get array of requests from schema
    let parsedUrl = require('url').parse(_.isString(url) ? url : ''),
      retVal = [],
      pathToMatch,
      matchedPath,
      matchedPathJsonPath,
      schemaPathItems = schema.paths,
      pathToMatchServer,
      filteredPathItemsArray = [];

    // Return no matches for invalid url (if unable to decode parsed url)
    try {
      pathToMatch = decodeURI(parsedUrl.pathname);
      if (!_.isNil(parsedUrl.hash)) {
        pathToMatch += parsedUrl.hash;
      }
    }
    catch (e) {
      console.warn(
        'Error decoding request URI endpoint. URI: ', url,
        'Error', e
      );
      return retVal;
    }

    // if pathToMatch starts with '/', we assume it's the correct path
    // if not, we assume the segment till the first '/' is the host
    // this is because a Postman URL like "{{url}}/a/b" will
    // likely have {{url}} as the host segment
    if (!pathToMatch.startsWith('/')) {
      pathToMatch = pathToMatch.substring(pathToMatch.indexOf('/'));
    }

    // Here, only take pathItemObjects that have the right method
    // of those that do, determine a score
    // then just pick that key-value pair from schemaPathItems
    _.forOwn(schemaPathItems, (pathItemObject, path) => {
      if (!pathItemObject) {
        // invalid schema. schema.paths had an invalid entry
        return true;
      }

      if (!pathItemObject.hasOwnProperty(method.toLowerCase())) {
        // the required method was not found at this path
        return true;
      }

      // filter empty parameters
      pathItemObject.parameters = _.reduce(pathItemObject.parameters, (accumulator, param) => {
        if (!_.isEmpty(param)) {
          accumulator.push(param);
        }
        return accumulator;
      }, []);
      let schemaMatchResult = { match: false };
      // check if path and pathToMatch match (non-null)
      // check in explicit (local defined) servers
      if (pathItemObject[method.toLowerCase()].servers) {
        pathToMatchServer = handleExplicitServersPathToMatch(pathToMatch, path);
        schemaMatchResult = getPostmanUrlSchemaMatchScore(pathToMatchServer, path, options);
      }
      else {
        schemaMatchResult = getPostmanUrlSchemaMatchScore(pathToMatch, path, options);
      }
      if (!schemaMatchResult.match) {
        // there was no reasonable match b/w the postman path and this schema path
        return true;
      }

      filteredPathItemsArray.push({
        path,
        pathItem: pathItemObject,
        matchScore: schemaMatchResult.score,
        pathVars: schemaMatchResult.pathVars,
        // No. of fixed segment matches between schema and postman url path
        // i.e. schema path /user/{userId} and request path /user/{{userId}} has 1 fixed segment match ('user')
        fixedMatchedSegments: schemaMatchResult.fixedMatchedSegments,
        // No. of variable segment matches between schema and postman url path
        // i.e. schema path /user/{userId} and request path /user/{{userId}} has 1 variable segment match ('{userId}')
        variableMatchedSegments: schemaMatchResult.variableMatchedSegments
      });
    });

    // order endpoints with more fix matched segments and variable matched segments (for tie in former) first in result
    filteredPathItemsArray = _.orderBy(filteredPathItemsArray, ['fixedMatchedSegments', 'variableMatchedSegments'],
      ['desc', 'desc']);

    _.each(filteredPathItemsArray, (fp) => {
      let path = fp.path,
        pathItemObject = fp.pathItem,
        score = fp.matchScore,
        pathVars = fp.pathVars;

      matchedPath = pathItemObject[method.toLowerCase()];
      if (!matchedPath) {
        // method existed at the path, but was a falsy value
        return true;
      }

      matchedPathJsonPath = `$.paths[${path}]`;

      // filter empty parameters
      matchedPath.parameters = _.reduce(matchedPath.parameters, (accumulator, param) => {
        if (!_.isEmpty(param)) {
          accumulator.push(param);
        }
        return accumulator;
      }, []);

      // aggregate local + global parameters for this path
      matchedPath.parameters = _.map(matchedPath.parameters, (commonParam) => {
        // for path-specifix params that are added to the path, have a way to identify them
        // when the schemaPath is required
        // method is lowercased because OAS methods are always lowercase
        commonParam.pathPrefix = `${matchedPathJsonPath}.${method.toLowerCase()}.parameters`;

        return commonParam;
      }).concat(
        _.map(pathItemObject.parameters || [], (commonParam) => {
          // for common params that are added to the path, have a way to identify them
          // when the schemaPath is required
          commonParam.pathPrefix = matchedPathJsonPath + '.parameters';
          return commonParam;
        })
      );

      retVal.push({
        // using path instead of operationId / sumamry since it's widely understood
        name: method + ' ' + path,
        // assign path as schemaPathName property to use path in path object
        path: _.assign(matchedPath, { schemaPathName: path }),
        jsonPath: matchedPathJsonPath + '.' + method.toLowerCase(),
        pathVariables: pathVars,
        score: score
      });

      // code reaching here indicates the given method was not found
      return true;
    });

    return retVal;
  },

  getPostmanUrlSuffixSchemaScore,
  isPmVariable
};
