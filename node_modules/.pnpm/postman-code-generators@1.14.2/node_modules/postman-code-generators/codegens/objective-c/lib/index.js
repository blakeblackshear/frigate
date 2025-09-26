var _ = require('./lodash'),
  sanitizeOptions = require('./util').sanitizeOptions,
  sanitize = require('./util').sanitize,
  addFormParam = require('./util').addFormParam,
  self;

/**
 * Parses Raw data
 *
 * @param {Object} body Raw body data
 * @param {String} indent indentation required for code snippet
 * @param {Boolean} trim indicates whether to trim string or not
 */
function parseRawBody (body, indent, trim) {
  var bodySnippet = '';
  bodySnippet += 'NSData *postData = [[NSData alloc] initWithData:[@"' + sanitize(body.toString(), trim) + '" ' +
  'dataUsingEncoding:NSUTF8StringEncoding]];\n';
  bodySnippet += '[request setHTTPBody:postData];\n';
  return bodySnippet;
}

/**
 * Parses GraphQL body
 *
 * @param {Object} body GraphQL body
 * @param {String} indent indentation required for code snippet
 * @param {Boolean} trim indicates whether to trim string or not
 */
function parseGraphQLBody (body, indent, trim) {
  var bodySnippet = '',
    rawBody = JSON.stringify(body);
  bodySnippet += 'NSData *postData = [[NSData alloc] initWithData:[@"' + sanitize(rawBody, trim) + '" ' +
  'dataUsingEncoding:NSUTF8StringEncoding]];\n';
  bodySnippet += '[request setHTTPBody:postData];\n';
  return bodySnippet;
}

/**
 * Parses URLEncoded body
 *
 * @param {Object} body URLEncoded Body
 * @param {String} indent indentation required for code snippet
 * @param {Boolean} trim indicates whether to trim string or not
 */
function parseURLEncodedBody (body, indent, trim) {
  let bodySnippet = '',
    key,
    value,
    first = true;
  _.forEach(body, function (data) {
    if (!data.disabled) {
      key = trim ? data.key.trim() : data.key;
      value = trim ? data.value.trim() : data.value;
      if (first) {
        bodySnippet += 'NSMutableData *postData = [[NSMutableData alloc] initWithData:[@"' +
        sanitize(key, true) + '=' + sanitize(value, trim) + '" dataUsingEncoding:NSUTF8StringEncoding]];\n';
      }
      else {
        bodySnippet += '[postData appendData:[@"&' + sanitize(key, true) + '=' + sanitize(value, trim) +
        '" dataUsingEncoding:NSUTF8StringEncoding]];\n';
      }
      first = false;
    }
  });
  bodySnippet += '[request setHTTPBody:postData];\n';
  return bodySnippet;
}

/**
 * Parses form data body from request
 *
 * @param {Object} body form data Body
 * @param {String} indent indentation required for code snippet
 * @param {Boolean} trim indicates whether to trim string or not
 */
function parseFormData (body, indent, trim) {
  let bodySnippet = '',
    formDataArray = [],
    key,
    foundFile = false,
    value;

  if (_.isEmpty(body)) {
    return bodySnippet;
  }

  bodySnippet += 'NSArray *parameters = @[';

  _.forEach(body, function (data) {
    key = trim ? data.key.trim() : data.key;
    value = trim ? data.value.trim() : data.value;
    if (!data.disabled) {
      if (data.type === 'file') {
        foundFile = true;
        formDataArray.push(`\n${indent}@{ @"name": @"${key}", @"fileName": @"${data.src}" }`);
      }
      else {
        formDataArray.push(`\n${indent}@{ @"name": @"${key}", @"value": @"${sanitize(value, trim)}" }`);
      }
    }
  });
  bodySnippet += formDataArray.join(', ');
  bodySnippet += ' \n];\n';
  bodySnippet += '\nNSString *boundary = @"----WebKitFormBoundary7MA4YWxkTrZu0gW";\n';
  bodySnippet += 'NSError *error;\n';
  bodySnippet += 'NSMutableString *body = [NSMutableString string];\n';
  bodySnippet += '\nfor (NSDictionary *param in parameters) {\n';
  bodySnippet += indent + '[body appendFormat:@"--%@\\r\\n", boundary];\n';
  if (foundFile) {
    bodySnippet += indent + 'if (param[@"fileName"]) {\n';
    // eslint-disable-next-line max-len
    bodySnippet += indent.repeat(2) + '[body appendFormat:@"Content-Disposition:form-data; name=\\"%@\\"; filename=\\"%@\\"\\r\\n", param[@"name"], param[@"fileName"]];\n';
    bodySnippet += indent.repeat(2) + '[body appendFormat:@"Content-Type: %@\\r\\n\\r\\n", param[@"contentType"]];\n';
    // eslint-disable-next-line max-len
    bodySnippet += indent.repeat(2) + '[body appendFormat:@"%@", [NSString stringWithContentsOfFile:param[@"fileName"]' +
      ' encoding:NSUTF8StringEncoding error:&error]];\n';
    bodySnippet += indent.repeat(2) + 'if (error) {\n';
    bodySnippet += indent.repeat(3) + 'NSLog(@"%@", error);\n';
    bodySnippet += indent.repeat(2) + '}\n';
    bodySnippet += indent + '} else {\n';
    bodySnippet += indent.repeat(2) +
      '[body appendFormat:@"Content-Disposition:form-data; name=\\"%@\\"\\r\\n\\r\\n", param[@"name"]];\n';
    bodySnippet += indent.repeat(2) + '[body appendFormat:@"%@", param[@"value"]];\n';
    bodySnippet += indent + '}\n';
  }
  else {
    bodySnippet += indent +
      '[body appendFormat:@"Content-Disposition:form-data; name=\\"%@\\"\\r\\n\\r\\n", param[@"name"]];\n';
    bodySnippet += indent + '[body appendFormat:@"%@", param[@"value"]];\n';
  }
  bodySnippet += '}\n';
  bodySnippet += '[body appendFormat:@"\\r\\n--%@--\\r\\n", boundary];\n';
  bodySnippet += 'NSData *postData = [body dataUsingEncoding:NSUTF8StringEncoding];\n';
  bodySnippet += '[request setHTTPBody:postData];\n';
  return bodySnippet;
}

/**
 * Parses Body from the Request
 *
 * @param {Object} body body object from request.
 * @param {String} indent indentation required for code snippet
 * @param {trim} trim indicates whether to trim string or not
 */
function parseBody (body, indent, trim) {
  if (!_.isEmpty(body)) {
    switch (body.mode) {
      case 'urlencoded':
        return parseURLEncodedBody(body.urlencoded, indent, trim);
      case 'raw':
        return parseRawBody(body.raw, indent, trim);
      case 'formdata':
        return parseFormData(body.formdata, indent, trim);
      case 'file':
        return '';
      case 'graphql':
        return parseGraphQLBody(body.graphql, indent, trim);
      default:
        return '<file-content-here>';
    }
  }
  return '';
}

/**
 * Parses headers from the request.
 *
 * @param {Object} headersArray array containing headers
 * @param {String} indent indentation required for code snippet
 * @param {Boolean} trim indicates whether to trim string or not
 */
function parseHeaders (headersArray, indent, trim) {
  var headerString = '',
    headerDictionary = [];
  if (_.isEmpty(headersArray)) {
    return headerString;
  }
  headerString = 'NSDictionary *headers = @{\n';

  _.forEach(headersArray, function (header) {
    if (!header.disabled) {
      headerDictionary.push(indent + '@"' + header.key + '": @"' + sanitize(header.value, trim) + '"');
    }
  });
  headerString += headerDictionary.join(',\n');
  headerString += '\n};\n\n';
  headerString += '[request setAllHTTPHeaderFields:headers];\n';
  return headerString;
}

self = module.exports = {
  convert: function (request, options, callback) {
    var indent,
      codeSnippet = '',
      requestTimeout,
      headerSnippet = '#import <Foundation/Foundation.h>\n\n',
      footerSnippet = '',
      trim;
    options = sanitizeOptions(options, self.getOptions());
    trim = options.trimRequestBody;
    indent = options.indentType === 'tab' ? '\t' : ' ';
    indent = indent.repeat(options.indentCount);

    requestTimeout = options.requestTimeout / 1000; // Objective-C takes time in seconds.

    if (!_.isFunction(callback)) {
      throw new Error('Callback is not valid function');
    }

    if (request.body && !request.headers.has('Content-Type')) {
      if (request.body.mode === 'file') {
        request.addHeader({
          key: 'Content-Type',
          value: 'text/plain'
        });
      }
      else if (request.body.mode === 'graphql') {
        request.addHeader({
          key: 'Content-Type',
          value: 'application/json'
        });
      }
    }

    // The following code handles multiple files in the same formdata param.
    // It removes the form data params where the src property is an array of filepath strings
    // Splits that array into different form data params with src set as a single filepath string
    if (request.body && request.body.mode === 'formdata') {
      let formdata = request.body.formdata,
        formdataArray = [];
      formdata.members.forEach((param) => {
        let key = param.key,
          type = param.type,
          disabled = param.disabled,
          contentType = param.contentType;
        if (type === 'file') {
          if (typeof param.src !== 'string') {
            if (Array.isArray(param.src) && param.src.length) {
              param.src.forEach((filePath) => {
                addFormParam(formdataArray, key, param.type, filePath, disabled, contentType);
              });
            }
            else {
              addFormParam(formdataArray, key, param.type, '/path/to/file', disabled, contentType);
            }
          }
          else {
            addFormParam(formdataArray, key, param.type, param.src, disabled, contentType);
          }
        }
        else {
          addFormParam(formdataArray, key, param.type, param.value, disabled, contentType);
        }
      });
      request.body.update({
        mode: 'formdata',
        formdata: formdataArray
      });
    }
    if (options.includeBoilerplate) {
      headerSnippet += 'int main(int argc, const char * argv[]) {\n\n';
      footerSnippet += '}';
    }
    codeSnippet += 'dispatch_semaphore_t sema = dispatch_semaphore_create(0);\n\n';
    codeSnippet += 'NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:@"' +
      encodeURI(request.url.toString()) + '"]\n';
    codeSnippet += `${indent}cachePolicy:NSURLRequestUseProtocolCachePolicy\n`;
    codeSnippet += `${indent}timeoutInterval:${requestTimeout}.0];\n`;

    // TODO: use defaultSessionConfiguration
    // codeSnippet += 'NSURLSessionConfiguration *config = [NSURLSessionConfiguration defaultSessionConfiguration];\n';

    codeSnippet += parseHeaders(request.headers.toJSON(), indent, trim);
    codeSnippet += parseBody(request.body ? request.body.toJSON() : {}, indent, trim) + '\n';
    codeSnippet += '[request setHTTPMethod:@"' + request.method + '"];\n\n';
    codeSnippet += 'NSURLSession *session = [NSURLSession sharedSession];\n';
    codeSnippet += 'NSURLSessionDataTask *dataTask = [session dataTaskWithRequest:request\n';
    codeSnippet += 'completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {\n';
    codeSnippet += `${indent}if (error) {\n`;
    codeSnippet += `${indent.repeat(2)}NSLog(@"%@", error);\n`;
    codeSnippet += `${indent.repeat(2)}dispatch_semaphore_signal(sema);\n`;
    codeSnippet += `${indent}} else {\n`;
    codeSnippet += `${indent.repeat(2)}NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *) response;\n`;
    codeSnippet += `${indent.repeat(2)}NSError *parseError = nil;\n`;
    // eslint-disable-next-line max-len
    codeSnippet += `${indent.repeat(2)}NSDictionary *responseDictionary = [NSJSONSerialization JSONObjectWithData:data options:0 error:&parseError];\n`;
    codeSnippet += `${indent.repeat(2)}NSLog(@"%@",responseDictionary);\n`;
    codeSnippet += `${indent.repeat(2)}dispatch_semaphore_signal(sema);\n`;
    codeSnippet += `${indent}}\n`;
    codeSnippet += '}];\n';
    codeSnippet += '[dataTask resume];\n';
    codeSnippet += 'dispatch_semaphore_wait(sema, DISPATCH_TIME_FOREVER);';

    //  if boilerplate is included then two more indent needs to be added in snippet
    (options.includeBoilerplate) &&
    (codeSnippet = indent + codeSnippet.split('\n').join('\n' + indent) + '\n');

    callback(null, headerSnippet + codeSnippet + footerSnippet);
  },
  getOptions: function () {
    return [
      {
        name: 'Set indentation count',
        id: 'indentCount',
        type: 'positiveInteger',
        default: 2,
        description: 'Set the number of indentation characters to add per code level'
      },
      {
        name: 'Set indentation type',
        id: 'indentType',
        type: 'enum',
        availableOptions: ['Tab', 'Space'],
        default: 'Space',
        description: 'Select the character used to indent lines of code'
      },
      {
        name: 'Set request timeout',
        id: 'requestTimeout',
        type: 'positiveInteger',
        // Using 10 secs as default
        // TODO: Find out a way to set infinite timeout.
        default: 10000,
        description: 'Set number of milliseconds the request should wait for a response' +
    ' before timing out (use 0 for infinity)'
      },
      {
        name: 'Trim request body fields',
        id: 'trimRequestBody',
        type: 'boolean',
        default: false,
        description: 'Remove white space and additional lines that may affect the server\'s response'
      },
      {
        name: 'Include boilerplate',
        id: 'includeBoilerplate',
        type: 'boolean',
        default: false,
        description: 'Include class definition and import statements in snippet'
      }
    ];
  }
};
