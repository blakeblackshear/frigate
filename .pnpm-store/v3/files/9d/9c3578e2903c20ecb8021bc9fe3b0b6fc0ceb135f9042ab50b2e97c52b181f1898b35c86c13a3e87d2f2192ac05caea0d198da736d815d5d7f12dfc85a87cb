var expect = require('chai').expect,
  { Request } = require('postman-collection/lib/collection/request'),
  sanitize = require('../../lib/util').sanitize,
  parseBody = require('../../lib/parseRequest').parseBody,
  getOptions = require('../../lib/index').getOptions,
  convert = require('../../lib/index').convert,
  mainCollection = require('./fixtures/testcollection/collection.json');

describe('nodejs-axios convert function', function () {
  describe('Convert function', function () {
    let request,
      reqObject,
      options = {},
      snippetArray,
      line_no;

    it('should return a Tab indented snippet ', function () {
      request = new Request(mainCollection.item[0].request);
      options = {
        indentType: 'Tab',
        indentCount: 1
      };
      convert(request, options, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
        }

        expect(snippet).to.be.a('string');
        snippetArray = snippet.split('\n');
        for (var i = 0; i < snippetArray.length; i++) {
          if (snippetArray[i] === 'let config = {') { line_no = i + 1; }
        }
        expect(snippetArray[line_no].charAt(0)).to.equal('\t');
      });
    });

    it('should return snippet with timeout property when timeout is set to non zero', function () {
      request = new Request(mainCollection.item[0].request);
      options = {
        requestTimeout: 1000
      };
      convert(request, options, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
          return;
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.include('timeout: 1000');
      });
    });

    it('should use JSON.parse if the content-type is application/vnd.api+json', function () {
      request = new Request({
        'method': 'POST',
        'header': [
          {
            'key': 'Content-Type',
            'value': 'application/vnd.api+json'
          }
        ],
        'body': {
          'mode': 'raw',
          'raw': '{"data": {"hello": "world"} }'
        },
        'url': {
          'raw': 'https://postman-echo.com/get',
          'protocol': 'https',
          'host': [
            'postman-echo',
            'com'
          ],
          'path': [
            'get'
          ]
        }
      });
      convert(request, {}, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.contain('JSON.stringify({\n  "data": {\n    "hello": "world"\n  }\n})');
      });
    });

    describe('maxRedirects property', function () {
      it('should return snippet with maxRedirects property set to ' +
      '0 for no follow redirect', function () {
        const request = new Request(mainCollection.item[0].request);
        options = {
          followRedirect: false
        };
        convert(request, options, function (error, snippet) {
          if (error) {
            expect.fail(null, null, error);
          }

          expect(snippet).to.be.a('string');
          expect(snippet).to.include('maxRedirects: 0');
        });
      });

      it('should return snippet with maxRedirects property set to ' +
      '0 for no follow redirect from request settings', function () {
        const request = new Request(mainCollection.item[0].request),
          options = {};

        request.protocolProfileBehavior = {
          followRedirects: false
        };

        convert(request, options, function (error, snippet) {
          if (error) {
            expect.fail(null, null, error);
          }

          expect(snippet).to.be.a('string');
          expect(snippet).to.include('maxRedirects: 0');
        });
      });

      it('should return snippet with no maxRedirects property when ' +
        'follow redirect is true from request settings', function () {
        const request = new Request(mainCollection.item[0].request),
          options = {};

        request.protocolProfileBehavior = {
          followRedirects: true
        };

        convert(request, options, function (error, snippet) {
          if (error) {
            expect.fail(null, null, error);
          }

          expect(snippet).to.be.a('string');
          expect(snippet).to.not.include('maxRedirects');
        });
      });
    });

    it('should return valid code snippet for no headers and no body', function () {
      reqObject = {
        'description': 'This is a sample POST request without headers and body',
        'url': 'https://echo.getpostman.com/post',
        'method': 'POST'
      };
      request = new Request(reqObject);
      convert(request, options, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
          return;
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.include('headers: { }');
      });
    });

    it('should not fail for a random body mode', function () {
      request = new Request(mainCollection.item[2].request);
      request.body.mode = 'random';
      request.body[request.body.mode] = {};

      convert(request, options, function (error, snippet) {

        if (error) {
          expect.fail(null, null, error);
          return;
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.not.include('body:');
      });
    });

    it('should generate snippet for file body mode', function () {
      request = new Request({
        'url': 'https://echo.getpostman.com/post',
        'method': 'POST',
        'body': {
          'mode': 'file',
          'file': [
            {
              'key': 'fileName',
              'src': 'file',
              'type': 'file'
            }
          ]
        }
      });
      options = { indentType: 'Space', indentCount: 2 };
      convert(request, options, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.not.equal('');
      });
    });

    it('should add content type if formdata field contains a content-type', function () {
      request = new Request({
        'method': 'POST',
        'body': {
          'mode': 'formdata',
          'formdata': [
            {
              'key': 'json',
              'value': '{"hello": "world"}',
              'contentType': 'application/json',
              'type': 'text'
            }
          ]
        },
        'url': {
          'raw': 'http://postman-echo.com/post',
          'host': [
            'postman-echo',
            'com'
          ],
          'path': [
            'post'
          ]
        }
      });

      convert(request, {}, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.contain('data.append(\'json\', \'{"hello": "world"}\', {contentType: \'application/json\'});'); // eslint-disable-line max-len
      });
    });

    it('should return snippet with proper semicolon placed where required', function () {
      // testing for the below snippet
      /*
        const axios = require('axios');
        const config = {
          'method': 'get',
          'url': 'https://postman-echo.com/headers',
          'headers': {
            'my-sample-header': 'Lorem ipsum dolor sit amet',
            'not-disabled-header': 'ENABLED'
          }
        }
        axios(config)
        .then(function (response) {
          console.log(JSON.stringify(response.data));
        })
        .catch(function (error) {
          console.log(error);
        });
        */
      request = new Request(mainCollection.item[0].request);
      options = {};
      convert(request, options, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
        }
        expect(snippet).to.be.a('string');
        var snippetArray = snippet.split('\n');
        snippetArray.forEach(function (line) {
          if (line.charAt(line.length - 2) === ')') {
            expect(line.charAt(line.length - 1)).to.equal(';');
          }
        });
        // -2 because last one is a newline
        const lastLine = snippetArray[snippetArray.length - 2];
        expect(lastLine.charAt(lastLine.length - 1)).to.equal(';');
      });
    });

    it('should return snippet with no trailing comma when requestTimeout ' +
      'is set to non zero', function () {
      request = new Request(mainCollection.item[0].request);
      options = {
        requestTimeout: 1000
      };
      convert(request, options, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
          return;
        }

        expect(snippet).to.be.a('string');
        expect(snippet).to.not.include('timeout: 1000,');
        expect(snippet).to.include('timeout: 1000');
      });
    });

    it('should return snippet with just a single comma when requestTimeout ' +
      'is set to non zero and followRedirect as false', function () {
      request = new Request(mainCollection.item[0].request);
      options = {
        requestTimeout: 1000,
        followRedirect: false,
        indentCount: 1,
        indentType: 'space'
      };
      convert(request, options, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
          return;
        }

        expect(snippet).to.be.a('string');
        expect(snippet).to.not.include('timeout: 1000,,');
        expect(snippet).to.include('timeout: 1000,\n maxRedirects: 0');
      });
    });

    it('should not require unused fs', function () {
      request = new Request({
        'url': 'https://postman-echo.com/get',
        'method': 'GET',
        'body': {
          'mode': 'raw',
          'raw': ''
        }
      });
      convert(request, {}, (error, snippet) => {
        if (error) {
          expect.fail(null, null, error);
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.not.include('const fs = require(\'fs\')');
      });
    });

    it('should add fs for form-data file upload', function () {
      request = new Request({
        'url': 'https://postman-echo.com/post',
        'method': 'POST',
        'body': {
          'mode': 'formdata',
          'formdata': [
            {
              'key': 'fileName',
              'src': '/some/path/file.txt',
              'type': 'file'
            }
          ]
        }
      });
      convert(request, {}, (error, snippet) => {
        if (error) {
          expect.fail(null, null, error);
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.include('let data = new FormData()');
      });
    });

    it('should trim header keys and not trim header values', function () {
      var request = new Request({
        'method': 'GET',
        'header': [
          {
            'key': '   key_containing_whitespaces  ',
            'value': '  value_containing_whitespaces  '
          }
        ],
        'url': {
          'raw': 'https://google.com',
          'protocol': 'https',
          'host': [
            'google',
            'com'
          ]
        }
      });
      convert(request, {}, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.include('\'key_containing_whitespaces\': \'  value_containing_whitespaces  \'');
      });
    });

    it('should include JSON.stringify in the snippet for raw json bodies', function () {
      var request = new Request({
        'method': 'POST',
        'header': [
          {
            'key': 'Content-Type',
            'value': 'application/json'
          }
        ],
        'body': {
          'mode': 'raw',
          'raw': '{\n  "json": "Test-Test"\n}'
        },
        'url': {
          'raw': 'https://postman-echo.com/post',
          'protocol': 'https',
          'host': [
            'postman-echo',
            'com'
          ],
          'path': [
            'post'
          ]
        }
      });
      convert(request, {}, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.include('data = JSON.stringify({\n  "json": "Test-Test"\n})');
      });
    });

    it('should generate snippets for no files in form data', function () {
      var request = new Request({
        'method': 'POST',
        'header': [],
        'body': {
          'mode': 'formdata',
          'formdata': [
            {
              'key': 'no file',
              'value': '',
              'type': 'file',
              'src': []
            },
            {
              'key': 'no src',
              'value': '',
              'type': 'file'
            },
            {
              'key': 'invalid src',
              'value': '',
              'type': 'file',
              'src': {}
            }
          ]
        },
        'url': {
          'raw': 'https://postman-echo.com/post',
          'protocol': 'https',
          'host': [
            'postman-echo',
            'com'
          ],
          'path': [
            'post'
          ]
        }
      });
      convert(request, {}, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.include('data.append(\'no file\', fs.createReadStream(\'/path/to/file\'));');
        expect(snippet).to.include('data.append(\'no src\', fs.createReadStream(\'/path/to/file\'));');
        expect(snippet).to.include('data.append(\'invalid src\', fs.createReadStream(\'/path/to/file\'));');
      });
    });

    it('should return snippet with maxBodyLength property as "Infinity"', function () {
      request = new Request(mainCollection.item[0].request);
      options = {
        requestTimeout: 1000
      };
      convert(request, options, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
          return;
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.include('maxBodyLength: Infinity');
      });
    });

    it('should return snippet with promise based code when async_await is disabled', function () {
      const request = new Request(mainCollection.item[0].request);

      convert(request, {}, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.include('axios.request(config)');
        expect(snippet).to.include('.then((response) => {');
        expect(snippet).to.include('.catch((error) => {');
      });
    });

    it('should return snippet with async/await based code when option is enabled', function () {
      const request = new Request(mainCollection.item[0].request);

      convert(request, { asyncAwaitEnabled: true }, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.include('async function makeRequest() {');
        expect(snippet).to.include('const response = await axios.request(config);');
        expect(snippet).to.include('catch (error) {');
        expect(snippet).to.include('makeRequest();');
      });
    });

    describe('getOptions function', function () {

      it('should return an array of specific options', function () {
        expect(getOptions()).to.be.an('array');
      });

      it('should return all the valid options', function () {
        expect(getOptions()[0]).to.have.property('id', 'indentCount');
        expect(getOptions()[1]).to.have.property('id', 'indentType');
        expect(getOptions()[2]).to.have.property('id', 'requestTimeout');
        expect(getOptions()[3]).to.have.property('id', 'followRedirect');
        expect(getOptions()[4]).to.have.property('id', 'trimRequestBody');
        expect(getOptions()[5]).to.have.property('id', 'asyncAwaitEnabled');
      });
    });

    describe('Sanitize function', function () {

      it('should return empty string when input is not a string type', function () {
        expect(sanitize(123, false)).to.equal('');
        expect(sanitize(null, false)).to.equal('');
        expect(sanitize({}, false)).to.equal('');
        expect(sanitize([], false)).to.equal('');
      });

      it('should trim input string when needed', function () {
        expect(sanitize('inputString     ', true)).to.equal('inputString');
      });
    });

    describe('parseRequest function', function () {

      it('should return empty string for empty body', function () {
        expect(parseBody(null, ' ', false)).to.equal('');
      });
    });
  });
});
