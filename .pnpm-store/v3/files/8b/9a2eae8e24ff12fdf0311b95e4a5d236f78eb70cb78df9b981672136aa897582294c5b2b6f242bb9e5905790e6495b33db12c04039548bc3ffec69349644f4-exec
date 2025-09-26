var fs = require('fs')
var should = require('should')
var unirest = require('../index')
var express = require('express')
var bodyParser = require('body-parser')

// Mock Server
var app = express()
var server

describe('Unirest', function () {
  describe('Cookie Jar', function () {
    it('should contain both add and getCookieString methods', function (done) {
      var jar = unirest.jar()

      jar.should.have.property('add')
      jar.should.have.property('getCookieString')
      jar.add.should.be.a.Function
      jar.getCookieString.should.be.a.Function

      done()
    })
  })

  describe('GET request', function () {
    it('should correctly parse JSON.', function (done) {
      unirest.get('http://mockbin.com/request').set('Accept', 'application/json').end(function (response) {
        should(response.status).equal(200)
        should(response.body).have.type('object')
        done()
      })
    })

    it('should correctly parse GZIPPED data.', function (done) {
      unirest.get('http://mockbin.com/gzip/request').set('Accept-Encoding', 'gzip').end(function (response) {
        should(response.status).equal(200)
        should(response.body).have.type('object')
        done()
      })
    })

    it('should correctly handle redirects.', function (done) {
      unirest.get('http://mockbin.com/redirect/302').timeout(2500).end(function (response) {
        should(response.status).equal(200)
        should(response.body).equal('redirect finished')
        done()
      })
    })

    it('should correctly handle timeouts.', function (done) {
      unirest.get('http://mockbin.com/redirect/3').timeout(20).end(function (response) {
        response.error.should.exist
        response.error.code.should.equal('ETIMEDOUT')
        done()
      })
    })

    it('should correctly handle timeouts with 3 retries.', function (done) {
      var retryCount = 0;
      unirest.get('http://mockbin.com/redirect/3')
        .timeout(20)
        .retry(function (response) {
          retryCount++;
        })
        .end(function (response) {
          response.error.should.exist
          response.error.code.should.equal('ETIMEDOUT')
          should(retryCount).equal(3)
          done()
        })
    })

    it('should correctly handle refused connections.', function (done) {
      unirest.get('http://localhost:9999').timeout(200).end(function (response) {
        response.error.should.exist
        response.error.code.should.equal('ECONNREFUSED')
        done()
      })
    })

    it('should be able to work like other unirest libraries', function (done) {
      unirest.get('http://mockbin.com/gzip/request', { 'Accept-Encoding': 'gzip' }, 'Hello World', function (response) {
        should(response.status).equal(200)
        should(response.body).have.type('object')
        done()
      })
    })

    it('should be able to return the request time', function (done) {
      unirest.get('http://mockbin.com').time(true).end(function (response) {
        should(typeof response.elapsedTime).equal('number')
        should((response.elapsedTime > 0), true)
        done()
      })
    })
  })

  describe('GET request', function () {
    var host, port, url
    var fixture = {
      message: 'some message under a json object'
    }

    before(function(done) {
      app.use(bodyParser.json({
        type: 'application/vnd.api+json'
      }))

      app.get('/', function handleRoot(req, res) {
        res.set('content-type', 'application/vnd.api+json')
        res.send(fixture)
      })

      server = app.listen(3000, function liftServer () {
        host = server.address().address
        port = server.address().port
        url = 'http://localhost:3000'
        done()
      })
    })

    after(function afterAll (done) {
      server.close(function closeCallback () {
        done()
      })
    })

    it('should get a json from the main route', function jsonTest (done) {
      unirest.get(url).type('json').end(function endJsonTest (response) {
        response.body.should.eql(fixture)
        done()
      })
    })
  })

  describe('POST request', function () {
    it('should correctly post FORM data.', function (done) {
      var data = {
        is: 'unirest',
        my: 'name',
        hello: 'world'
      }

      unirest.post('http://mockbin.com/request').send(data).end(function (response) {
        should(response.status).equal(200)
        should(response.body.postData.params).have.type('object')
        should(response.body.postData.params).have.property('is', data.is)
        should(response.body.postData.params).have.property('my', data.my)
        should(response.body.postData.params).have.property('hello', data.hello)
        should(response.body.headers['content-length']).equal('30')
        should(response.body.headers['content-type']).equal('application/x-www-form-urlencoded')
        done()
      })
    })

    it('should not fail when content-type header is specified.', function (done) {
      var data = {
        is: 'unirest',
        my: 'name',
        hello: 'world',
        failing_to_encode_data: 'this is a test'
      }

      unirest.post('http://mockbin.com/request').header('Content-Type', 'application/x-www-form-urlencoded').send(data).end(function (response) {
        should(response.status).equal(200)
        should(response.body.postData.params).have.type('object')
        should(response.body.postData.params).have.property('is', data.is)
        should(response.body.postData.params).have.property('my', data.my)
        should(response.body.postData.params).have.property('hello', data.hello)
        should(response.body.postData.params).have.property('failing_to_encode_data', data.failing_to_encode_data)
        should(response.body.headers['content-length']).equal('74')
        should(response.body.headers['content-type']).equal('application/x-www-form-urlencoded')
        done()
      })
    })

    it('should correctly transform FORM data.', function (done) {
      var data = {
        lebron: false,
        jordan: 23,
        testing: { key: 'value' },
        scores: [
          1,
          3,
          2,
          1,
          3
        ]
      }

      try {
        var request = unirest.post('http://mockbin.com/request').set('Accept', 'application/json')

        for (var key in data) {
          request.field(key, data[key])
        }

        request.end(function (response) {
          should(response.status).equal(200)
          should(response.body.postData.params).have.property('jordan', data.jordan.toString())
          should(response.body.postData.params).have.property('lebron', data.lebron.toString())
          should(response.body.postData.params).have.property('testing', JSON.stringify(data.testing))
          should(response.body.postData.params).have.property('scores', ['1', '3', '2', '1', '3'])
        })
      } catch (e) {
        done(e)
      } finally {
        done()
      }
    })

    it('should correctly post MULTIFORM data.', function (done) {
      var request = unirest.post('http://mockbin.com/request')
      var file = __dirname + '/../README.md'
      var data = {
        a: 'foo',
        b: 'bar',
        c: undefined
      }

      request.attach('u', file)

      for (var key in data) {
        request.field(key, data[key])
      }

      request.end(function (response) {
        should(response.status).equal(200)
        should(response.body.headers['content-type']).startWith('multipart/form-data')
        done()
      })
    })

    it('should correctly post MULTIFORM data using fs.createReadStream.', function (done) {
      var request = unirest.post('http://mockbin.com/request')
      var file = __dirname + '/../README.md'
      var data = {
        a: 'foo',
        b: 'bar',
        c: undefined
      }

      request.attach({'u': fs.createReadStream(file)})

      for (var key in data) {
        request.field(key, data[key])
      }

      request.end(function (response) {
        should(response.status).equal(200)
        should(response.body.headers['content-type']).startWith('multipart/form-data')
        done()
      })
    })

    it('should correctly post MULTIFORM data with port number', function (done) {
      var request = unirest.post('http://mockbin.com:80/request')
      var file = __dirname + '/../README.md'
      var data = {
        a: 'foo',
        b: 'bar',
        c: undefined
      }

      request.attach('u', file)

      for (var key in data) {
        request.field(key, data[key])
      }

      request.end(function (response) {
        should(response.status).equal(200)
        should(response.body.headers['content-type']).startWith('multipart/form-data')
        done()
      })
    })

    it('should correctly post JSON data.', function (done) {
      var data = {
        is: 'unirest',
        my: 'name',
        hello: 'world'
      }

      unirest.post('http://mockbin.com/echo').header('Content-Type', 'application/json').send(data).end(function (response) {
        should(response.status).equal(200)
        should(response.body).have.type('object')
        should(JSON.stringify(response.body)).equal(JSON.stringify(data))
        should(response.headers['content-type']).startWith('application/json')
        done()
      })
    })

    it('should correctly post JSON array.', function (done) {
      var data = [{
        is: 'unirest',
        my: 'name',
        hello: 'world'
      }]

      unirest.post('http://mockbin.com/echo').header('Content-Type', 'application/json').send(data).end(function (response) {
        should(response.status).equal(200)
        should(response.body).have.type('object')
        should(JSON.stringify(response.body)).equal(JSON.stringify(data))
        should(response.headers['content-type']).startWith('application/json')
        done()
      })
    })

    it('should check for buffers', function (done) {
      unirest.post('http://mockbin.com/request')
      .headers({ 'Accept': 'application/json' })
      .send(Buffer.from([1, 2, 3]))
      .end(function (response) {
        should(response.body.bodySize).exists
        should(response.body.bodySize).equal(3)
        done()
      })
    })

    it('should correctly post a buffer with mime-type', function (done) {
      unirest.post('http://mockbin.com/request')
      .headers({ 'Content-Type': 'img/svg+xml' })
      .send(Buffer.from('<svg></svg>'))
      .end(function (response) {
        should(response.body.headers['content-type']).equal('img/svg+xml')
        done()
      })
    })
  })

  describe('bodyparser', function unirestDescribe () {
    var host, port, url
    var postCall, exampleRequest

    before(function beforeAll (done) {
      exampleRequest = {
        data: {
          id: 1,
          type: 'Person',
          name: 'Nico'
        }
      }

      app.use(bodyParser.json({ type: 'application/vnd.api+json' }))

      app.post('/', function handleRoot (req, res) {
        res.send(req.body)
      })

      server = app.listen(3000, function liftServer () {
        host = server.address().address
        port = server.address().port
        url = 'http://localhost:3000'
        done()
      })
    })

    after(function afterAll (done) {
      server.close(function closeCallback () {
        done()
      })
    })

    it('should send a custom content type as a header using the type function', function jsonTest (done) {
      unirest
        .post(url + '/')
        .type('application/vnd.api+json')
        .send(exampleRequest)
        .end(function endJsonTest (response) {
          response.body.should.eql(exampleRequest)
          done()
        })
    })

    it('should send a custom header with the header function', function jsonTest (done) {
      unirest
        .post(url + '/')
        .header('Content-Type', 'application/vnd.api+json')
        .send(exampleRequest)
        .end(function endJsonTest (response) {
          response.body.should.eql(exampleRequest)
          done()
        })
    })
  })
})
