var _ = require('./lodash'),
  sanitize = require('./util').sanitize;

/**
 * Returns given content type or default if falsey
 *
 * @param {String} contentType
 * @returns {String}
 */
function parseContentType (contentType) {
  return contentType || 'text/plain';
}

/**
 * Parses header in Postman-SDK request and returns code snippet of csharp-httpclient for adding headers
 *
 * @param {Object} builder - Code Builder
 * @param {Object} requestJson - Postman SDK request object
 */
function parseHeader (builder, requestJson) {
  // Possibly add support for the typed header properties
  if (!Array.isArray(requestJson.header)) {
    return;
  }

  requestJson.header.forEach((header) => {
    if (!header.disabled && sanitize(header.key) !== 'Content-Type') {
      builder.appendLine(`request.Headers.Add("${sanitize(header.key, true)}", "${sanitize(header.value)}");`);
    }
  });
}

/**
 *
 * @param {CodeBuilder} builder
 * @param {Object} requestBody
 */
function parseFormUrlEncoded (builder, requestBody) {
  let list = requestBody[requestBody.mode].reduce((collection, data) => {
    if (data.disabled) {
      return collection;
    }

    (!data.value) && (data.value = '');
    collection.push('collection.Add(new' +
      `("${sanitize(data.key)}", "${sanitize(data.value)}"));`);

    return collection;
  }, []);

  if (list && !_.isEmpty(list)) {
    builder.appendLine('var collection = new List<KeyValuePair<string, string>>();');
    builder.appendLines(list);
    builder.appendLine('var content = new FormUrlEncodedContent(collection);');
    builder.appendLine('request.Content = content;');
    builder.addUsing('System.Collections.Generic');
  }
}

/**
 *
 * @param {CodeBuilder} builder
 * @param {String} key
 * @param {String} fileSrc
 */
function addFile (builder, key, fileSrc) {
  builder.appendLine('content.Add(new StreamContent(File.OpenRead' +
    `("${sanitize(fileSrc)}")), "${sanitize(key)}", "${sanitize(fileSrc)}");`);
}

/**
 *
 * @param {CodeBuilder} builder
 * @param {Object} requestBody
 */
function parseFormData (builder, requestBody) {
  var allDisabled = requestBody[requestBody.mode].every((i) => {
    return i.disabled;
  });

  if (allDisabled) {
    return;
  }

  builder.appendLine('var content = new MultipartFormDataContent();');

  requestBody[requestBody.mode].forEach((i) => {
    if (i.disabled) {
      return;
    }

    if (i.type === 'text') {
      builder.appendLine('content.Add(new StringContent(' +
        `"${sanitize(i.value)}"), "${sanitize(i.key)}");`);
    }
    else if (i.type === 'file') {
      if (Array.isArray(i.src)) {
        // Multiple files
        i.src.forEach((file) => {
          addFile(builder, i.key, file);
        });
      }
      else {
        // Single file
        addFile(builder, i.key, i.src);
      }
    }
  });


  builder.appendLine('request.Content = content;');
}

/**
 *
 * @param {CodeBuilder} builder
 * @param {Object} requestBody
 */
function parseGraphQL (builder, requestBody) {
  let query = requestBody.graphql.query,
    graphqlVariables;
  try {
    graphqlVariables = JSON.parse(requestBody.graphql.variables);
  }
  catch (e) {
    graphqlVariables = {};
  }
  builder.appendLine('var content = new StringContent(' +
    `"${sanitize(JSON.stringify({ query: query, variables: graphqlVariables }))}"` +
    ', null, "application/json");');
}

/**
 *
 * @param {CodeBuilder} builder
 * @param {Object} request
 */
function parseBody (builder, request) {
  var requestBody = request.body ? request.body.toJSON() : {},
    contentType = request.getHeaders({ enabled: true, ignoreCase: true })['content-type'];
  if (!_.isEmpty(requestBody)) {
    switch (requestBody.mode) {
      case 'urlencoded':
        parseFormUrlEncoded(builder, requestBody);
        break;
      case 'formdata':
        parseFormData(builder, requestBody);
        break;
      case 'raw':
        builder.appendLine(
          `var content = new StringContent(${JSON.stringify(requestBody[requestBody.mode])}, null, ` +
          `"${parseContentType(contentType)}");`);
        builder.appendLine('request.Content = content;');
        break;
      case 'graphql':
        parseGraphQL(builder, requestBody);
        builder.appendLine('request.Content = content;');
        break;
      case 'file':
        builder
          .appendLine('request.Content = new StreamContent(File.OpenRead("' +
            `${sanitize(requestBody[requestBody.mode].src || '"<File path>"')}"));`);
        builder.addUsing('System.IO');
        break;
      default:
    }
  }
  else if (contentType) {
    // The request has no body but sometimes it wants me to force a content-type anyways
    builder.appendLine('var content = new StringContent(string.Empty);');
    builder.appendLine('content.Headers.ContentType = new MediaTypeHeaderValue("' +
      `${contentType}");`);
    builder.addUsing('System.Net.Http.Headers');
    builder.appendLine('request.Content = content;');
  }
}

module.exports = {
  parseHeader: parseHeader,
  parseBody: parseBody
};
