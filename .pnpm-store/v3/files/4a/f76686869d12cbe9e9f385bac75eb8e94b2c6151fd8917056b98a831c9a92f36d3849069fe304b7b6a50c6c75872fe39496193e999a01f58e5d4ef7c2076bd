const sanitizeString = require('./sanitize').sanitizeString,
  _ = require('../lodash');

/**
 *
 * @param {Array} array - form data array
 * @param {String} key - key of form data param
 * @param {String} type - type of form data param(file/text)
 * @param {String} val - value/src property of form data param
 * @param {String} disabled - Boolean denoting whether the param is disabled or not
 * @param {String} contentType - content type header of the param
 *
 * Appends a single param to form data array
 */
function addFormParam (array, key, type, val, disabled, contentType) {
  if (type === 'file') {
    array.push({
      key: key,
      type: type,
      src: val,
      disabled: disabled,
      contentType: contentType
    });
  }
  else {
    array.push({
      key: key,
      type: type,
      value: val,
      disabled: disabled,
      contentType: contentType
    });
  }
}

/**
* parses a body to the corresponding snippet
*
* @param {object} body - postman request body
* @returns {String}
*/
function solveMultiFile (body) {
  if (body && body.mode === 'formdata') {
    let formdata = body.formdata,
      formdataArray = [];
    formdata.members.forEach((param) => {
      let key = param.key,
        type = param.type,
        disabled = param.disabled,
        contentType = param.contentType;
      // check if type is file or text
      if (type === 'file') {
        // if src is not of type string we check for array(multiple files)
        if (typeof param.src !== 'string') {
          // if src is an array(not empty), iterate over it and add files as separate form fields
          if (Array.isArray(param.src) && param.src.length) {
            param.src.forEach((filePath) => {
              addFormParam(formdataArray, key, param.type, filePath, disabled, contentType);
            });
          }
          // if src is not an array or string, or is an empty array, add a placeholder for file path(no files case)
          else {
            addFormParam(formdataArray, key, param.type, '/path/to/file', disabled, contentType);
          }
        }
        // if src is string, directly add the param with src as filepath
        else {
          addFormParam(formdataArray, key, param.type, param.src, disabled, contentType);
        }
      }
      // if type is text, directly add it to formdata array
      else {
        addFormParam(formdataArray, key, param.type, param.value, disabled, contentType);
      }
    });

    body.update({
      mode: 'formdata',
      formdata: formdataArray
    });
  }
  return body;
}

/**
 * Parses URL encoded body
 *
 * @param {Object} body body object from request.
 * @param {String} indentation indentation to be added to the snippet
 * @param {boolean} bodyTrim trim body option
 * @returns {String} snippet of the body generation
 */
function parseURLEncodedBody (body, indentation, bodyTrim) {
  let enabledBodyList = _.reject(body.members, 'disabled'),
    bodySnippet = '';
  if (!_.isEmpty(enabledBodyList)) {
    let bodyDataMap = _.map(enabledBodyList, (data) => {
      return `${indentation}"${sanitizeString(data.key, bodyTrim)}" = "${sanitizeString(data.value, bodyTrim)}"`;
    });
    bodySnippet += `c(\n${bodyDataMap.join(',\n')}\n)`;
  }
  return bodySnippet;
}

/**
 * builds a single data param
 *
 * @param {Object} data data of the param.
 * @param {String} indentation indentation to be added to the snippet
 * @param {boolean} bodyTrim trim body option
 * @returns {String} snippet of the body generation
 */
function buildFormDataParam (data, indentation, bodyTrim) {
  return `${indentation}"${sanitizeString(data.key, bodyTrim)}" = "${sanitizeString(data.value, bodyTrim)}"`;
}

/**
 * builds a data param for a file
 *
 * @param {Object} data item from the array of form data (key value).
 * @param {String} indentation indentation to be added to the snippet
 * @param {boolean} bodyTrim trim body option
 * @param {number} index index of the current file
 * @returns {String} snippet of file uploading
 */
function buildFormDataParamFile (data, indentation, bodyTrim, index) {
  return `file${index} = fileUpload(\n` +
    `${indentation.repeat(1)}filename = path.expand('${sanitizeString(data.src, bodyTrim)}')` +
    ')\n';
}

/**
 * builds a data param
 *
 * @param {Object} body body object from request.
 * @param {String} indentation indentation to be added to the snippet
 * @param {boolean} bodyTrim trim body option
 * @returns {String} snippet of the body generation
 */
function parseFormData (body, indentation, bodyTrim) {
  let enabledBodyList = _.reject(body.members, 'disabled'),
    numberOfFiles = 0,
    bodySnippet = '',
    fileSnippet = '';
  if (!_.isEmpty(enabledBodyList)) {
    let formDataFile, formData, bodyDataMap;
    formDataFile = enabledBodyList.filter((param) => {
      return param.type === 'file';
    });
    formData = enabledBodyList.filter((param) => {
      return param.type !== 'file';
    });
    bodyDataMap = _.map(formData, (data) => {
      return buildFormDataParam(data, indentation, bodyTrim);
    });
    numberOfFiles = formDataFile.length;
    _.forEach(formDataFile, (data, index) => {
      fileSnippet += buildFormDataParamFile(data, indentation, bodyTrim, index);
    });
    if (bodyDataMap.length > 0) {
      bodySnippet += `c(\n${bodyDataMap.join(',\n')}\n)`;
    }
  }
  return {bodySnippet, fileSnippet, numberOfFiles};
}

/**
 * Parses Raw data
 *
 * @param {Object} body body object from request.
 * @param {String} indentation indentation to be added to the snippet
 * @param {boolean} bodyTrim trim body option
 * @param {String} contentType Content type of the body being sent
 * @returns {String} snippet of the body generation
 */
function parseRawBody (body, indentation, bodyTrim, contentType) {
  let bodySnippet = '';
  if (contentType && (contentType === 'application/json' || contentType.match(/\+json$/))) {
    try {
      let jsonBody = JSON.parse(body);
      bodySnippet += `"${sanitizeString(JSON.stringify(jsonBody, null, indentation.length), bodyTrim)}"`;
    }
    catch (error) {
      bodySnippet += `"${sanitizeString(body.toString(), bodyTrim)}"`;
    }
  }
  else {
    bodySnippet += JSON.stringify(body.toString());
  }
  return bodySnippet;
}

/**
 * Parses Body of graphql
 *
 * @param {Object} body body object from request.
 * @param {boolean} bodyTrim trim body option
 * @return {String} the data for a binary file
 */
function parseGraphQL (body, bodyTrim) {
  const query = body.query;
  let bodySnippet = '',
    graphqlVariables;
  try {
    graphqlVariables = JSON.parse(body.variables);
  }
  catch (e) {
    graphqlVariables = {};
  }
  bodySnippet = `'${sanitizeString(JSON.stringify({
    query: query,
    variables: graphqlVariables
  }), bodyTrim)}';`;
  return bodySnippet;
}

/**
 * Parses Body of file
 *
 * @return {String} the data for a binary file
 */
function parseFromFile () {
  return '"<file contents here>";';
}


/**
 * Parses Body from the Request
 *
 * @param {Object} body body object from request.
 * @param {String} indentation indentation to be added to the snippet
 * @param {boolean} bodyTrim trim body option
 * @param {String} contentType Content type of the body being sent
 */
function processBodyModes (body, indentation, bodyTrim, contentType) {
  let bodySnippet = '';
  switch (body.mode) {
    case 'urlencoded': {
      bodySnippet = parseURLEncodedBody(body.urlencoded, indentation, bodyTrim);
      return bodySnippet === '' ? '' : `params = ${bodySnippet}\n`;
    }
    case 'raw': {
      bodySnippet = parseRawBody(body.raw, indentation, bodyTrim, contentType);
      return bodySnippet === '' ? '' : `params = ${bodySnippet}\n`;
    }
    case 'graphql': {
      bodySnippet = parseGraphQL(body.graphql, bodyTrim);
      return bodySnippet === '' ? '' : `params = ${bodySnippet}\n`;
    }
    case 'formdata': {
      let formData = parseFormData(body.formdata, indentation, bodyTrim),
        formParamsSnippet = formData.bodySnippet === '' ? '' : `params = ${formData.bodySnippet}\n`;
      return { bodySnippet: formParamsSnippet,
        fileSnippet: formData.fileSnippet,
        numberOfFiles: formData.numberOfFiles};
    }
    case 'file': {
      bodySnippet = parseFromFile();
      return bodySnippet === '' ? '' : `params = ${bodySnippet}\n`;
    }
    default: {
      bodySnippet = parseRawBody(body.raw, indentation, bodyTrim, contentType);
      return bodySnippet === '' ? '' : `params = ${bodySnippet}\n`;
    }
  }
}

/**
* parses a body to the corresponding snippet
*
* @param {object} body - postman request body
* @param {string} indentation - indentation character
* @param {boolean} bodyTrim trim body option
* @param {String} contentType Content type of the body being sent
* @returns {String/Object} snippet of the body generation or object for files information
*/
function parseBody (body, indentation, bodyTrim, contentType) {
  let snippet = '';
  if (body && !_.isEmpty(body)) {
    body = solveMultiFile(body);
    return processBodyModes(body, indentation, bodyTrim, contentType);
  }
  return snippet;
}

module.exports = {
  parseBody,
  parseURLEncodedBody,
  parseFormData,
  parseRawBody,
  parseGraphQL,
  buildFormDataParamFile
};
