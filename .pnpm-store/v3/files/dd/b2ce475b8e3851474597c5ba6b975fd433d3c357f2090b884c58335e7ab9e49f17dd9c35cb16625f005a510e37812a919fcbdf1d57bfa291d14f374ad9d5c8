const expect = require('chai').expect,
  { Request } = require('postman-collection/lib/collection/request'),
  convert = require('../../lib/index').convert;

describe('Rust reqwest converter', function () {
  it('should throw an error when callback is not function', function () {
    expect(function () { convert({}, {}); })
      .to.throw('Rust~reqwest-convert: Callback is not a function');
  });

  it('should set no redirect policy when followRedirect is set to false', function () {
    const request = new Request({
        'method': 'GET',
        'header': [],
        'url': {
          'raw': 'http://postman-echo.com/get',
          'protocol': 'http',
          'host': [
            'postman-echo',
            'com'
          ],
          'path': [
            'get'
          ]
        }
      }),
      options = {followRedirect: false};
    convert(request, options, function (error, snippet) {
      if (error) {
        expect.fail(null, null, error);
      }
      expect(snippet).to.be.a('string');
      expect(snippet).to.include('redirect(reqwest::redirect::Policy::none())');
    });
  });

  it('should set read timeout when requestTimeout is set to non zero value', function () {
    const request = new Request({
        'method': 'GET',
        'header': [],
        'url': {
          'raw': 'http://postman-echo.com/get',
          'protocol': 'http',
          'host': [
            'postman-echo',
            'com'
          ],
          'path': [
            'get'
          ]
        }
      }),
      options = {requestTimeout: 3000};
    convert(request, options, function (error, snippet) {
      if (error) {
        expect.fail(null, null, error);
      }
      expect(snippet).to.be.a('string');
      expect(snippet).to.include('timeout(std::time::Duration::from_millis(3000))');
    });
  });

  it('should use the method name directly if it is part of allowed methods', function () {
    ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'CONNECT', 'PATH', 'TRACE'].forEach(function (method) {
      const request = new Request({
          'method': method,
          'header': [],
          'url': {
            'raw': 'http://postman-echo.com/get',
            'protocol': 'http',
            'host': [
              'postman-echo',
              'com'
            ],
            'path': [
              'get'
            ]
          }
        }),
        options = {};
      convert(request, options, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.include(`let request = client.request(reqwest::Method::${method}`);
      });
    });
  });

  it('should use the method name using bytes if it not part of the allowed list', function () {
    ['PROPFIND', 'PURGE', 'LOCK', 'UNLOCK', 'LINK', 'UNLINK', 'COPY'].forEach(function (method) {
      const request = new Request({
          'method': method,
          'header': [],
          'url': {
            'raw': 'http://postman-echo.com/get',
            'protocol': 'http',
            'host': [
              'postman-echo',
              'com'
            ],
            'path': [
              'get'
            ]
          }
        }),
        options = {};
      convert(request, options, function (error, snippet) {
        if (error) {
          expect.fail(null, null, error);
        }
        expect(snippet).to.be.a('string');
        expect(snippet).to.include(`let method = "${method}"`);
        expect(snippet).to.include('let request = client.request(reqwest::Method::from_bytes(method.as_bytes())?');
      });
    });
  });

});
