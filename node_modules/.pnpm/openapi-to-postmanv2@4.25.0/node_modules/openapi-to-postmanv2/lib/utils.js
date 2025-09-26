const _ = require('lodash'),

  // This is the default collection name if one can't be inferred from the OpenAPI spec
  COLLECTION_NAME = 'Imported from OpenAPI';

// this will have non-OAS-related utils

module.exports = {
  // merge userOptions over defaultOptions
  mergeOptions: function (defaultOptions, userOptions) {
    let retVal = {};

    for (let id in defaultOptions) {
      if (defaultOptions.hasOwnProperty(id)) {
        // set the default value to that option if the user has not defined
        if (userOptions[id] === undefined) {
          retVal[id] = defaultOptions[id].default;

          // ignore case-sensitivity for enum option with type string
          if (defaultOptions[id].type === 'enum' && _.isString(retVal[id])) {
            retVal[id] = _.toLower(defaultOptions[id].default);
          }
          continue;
        }

        // check the type of the value of that option came from the user
        switch (defaultOptions[id].type) {
          case 'boolean':
            if (typeof userOptions[id] === defaultOptions[id].type) {
              retVal[id] = userOptions[id];
            }
            else {
              retVal[id] = defaultOptions[id].default;
            }
            break;
          case 'enum':
            // ignore case-sensitivity for string options
            if ((defaultOptions[id].availableOptions.includes(userOptions[id])) ||
              (_.isString(userOptions[id]) &&
              _.map(defaultOptions[id].availableOptions, _.toLower).includes(_.toLower(userOptions[id])))) {
              retVal[id] = userOptions[id];
            }
            else {
              retVal[id] = defaultOptions[id].default;
            }

            // ignore case-sensitivity for string options
            _.isString(retVal[id]) && (retVal[id] = _.toLower(retVal[id]));

            break;
          case 'array':
            // user input needs to be parsed
            retVal[id] = userOptions[id];

            if (typeof retVal[id] === 'string') {
              // eslint-disable-next-line max-depth
              try {
                retVal[id] = JSON.parse(userOptions[id]);
              }
              catch (e) {
                // user didn't provide valid JSON
                retVal[id] = defaultOptions[id].default;
              }
            }

            // for valid JSON that's not an array, fallback to default
            if (!Array.isArray(retVal[id])) {
              retVal[id] = defaultOptions[id].default;
            }

            break;
          case 'integer':
            if (_.isSafeInteger(userOptions[id])) {
              retVal[id] = userOptions[id];
            }
            else {
              retVal[id] = defaultOptions[id].default;
            }
            break;

          default:
            retVal[id] = defaultOptions[id].default;
        }
      }
    }

    return retVal;
  },

  /**
   * Converts Title/Camel case to a space-separated string
   * @param {*} string - string in snake/camelCase
   * @returns {string} space-separated string
   */
  insertSpacesInName: function (string) {
    if (!string || (typeof string !== 'string')) {
      return '';
    }

    return string
      .replace(/([a-z])([A-Z])/g, '$1 $2') // convert createUser to create User
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // convert NASAMission to NASA Mission
      .replace(/(_+)([a-zA-Z0-9])/g, ' $2'); // convert create_user to create user
  },

  /**
   * Trims request name string to 255 characters.
   *
   * @param {*} reqName - Request name
   * @returns {*} trimmed string upto 255 characters
   */
  trimRequestName: function (reqName) {
    if (typeof reqName === 'string') {
      return reqName.substring(0, 255);
    }
    return reqName;
  },

  /**
   * Finds the common subpath from an array of strings starting from the
   * strings starts
   * @param {Array} stringArrays - pointer to get the name from
   * @returns {string} - string: the common substring
   */
  findCommonSubpath(stringArrays) {
    if (!stringArrays || stringArrays.length === 0) {
      return '';
    }
    let cleanStringArrays = [],
      res = [];
    stringArrays.forEach((cString) => {
      if (cString) {
        cleanStringArrays.push(cString.split('/'));
      }
    });
    const asc = cleanStringArrays.sort((a, b) => { return a.length - b.length; });
    for (let segmentIndex = 0; segmentIndex < asc[0].length; segmentIndex++) {
      const segment = asc[0][segmentIndex];
      let nonCompliant = asc.find((cString) => {
        return cString[segmentIndex] !== segment;
      });
      if (nonCompliant) {
        break;
      }
      res.push(segment);
    }
    return res.join('/');
  },

  /**
   * Provides collection name to be used for generated collection
   *
   * @param {*} title - Definition title
   * @returns {String} - Collection name
   */
  getCollectionName: function (title) {
    if (_.isEmpty(title) || !_.isString(title)) {
      return COLLECTION_NAME;
    }

    return title;
  }
};
