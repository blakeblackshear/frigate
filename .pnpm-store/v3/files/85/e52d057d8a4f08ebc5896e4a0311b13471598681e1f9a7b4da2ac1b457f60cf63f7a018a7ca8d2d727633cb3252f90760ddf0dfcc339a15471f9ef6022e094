var fs = require('fs')
var unirest = require('../index')
var express = require('express')
var bodyParser = require('body-parser')

// Mock Server
var app = express()
var server

describe('Unirest Promises', function () {
  describe('GET', function () {
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

    it('supports async, and await', async function () {
      let response = await unirest.get(url).type('json')
      return response.body.should.eql(fixture)
    })

    it('support chaining', function jsonTest (done) {
      unirest
        .get(url)
        .type('json')
        .then(function (response) {
          return response
        })
        .then((response) => {
          response.body.should.eql(fixture)
          done()
        })
    })
  })
})
