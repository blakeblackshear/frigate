var chai = require('chai')
var compareModule = require('../../src')
var expect = chai.expect

var compare = function(a, b, expected, options) {
  var result = compareModule(a, b, options)
  expect(result).to.equal(expected)
}

describe('comparison', function() {
  describe('validation only', function() {
    it('checks the readme example', function() {
      compare({
        title: 'title 1',
        type: ['object'],
        uniqueItems: false,
        dependencies: {
          name: ['age', 'lastName']
        },
        required: ['name', 'age', 'name']
      }, {
        title: 'title 2',
        type: 'object',
        required: ['age', 'name'],
        dependencies: {
          name: ['lastName', 'age']
        },
        properties: {
          name: {
            minLength: 0
          }
        }
      }, false, {
        ignore: ['title']
      })
    })

    it('compares false and undefined', function() {
      compare(undefined, false, false)
    })
    it('compares required unsorted', function() {
      compare({
        required: ['test', 'rest']
      }, {
        required: ['rest', 'test', 'rest']
      }, true)
    })
    it('compares equal required empty array and undefined', function() {
      compare({
        required: []
      }, {}, true)

      compare({
        required: ['fds']
      }, {}, false)
    })
    it('compares equal properties empty object and undefined', function() {
      compare({
        properties: {}
      }, {}, true)
    })
    it('compares properties', function() {
      compare({
        properties: {
          foo: {
            type: 'string'
          }
        }
      }, {
        properties: {
          foo: {
            type: 'string'
          }
        }
      }, true)
    })
    it('compares equal patternProperties empty object and undefined', function() {
      compare({
        patternProperties: {}
      }, {}, true)
    })
    it('compares equal dependencies empty object and undefined', function() {
      compare({
        dependencies: {}
      }, {}, true)
    })
    it('compares type unsorted', function() {
      compare({
        type: ['string', 'array']
      }, {
        type: ['array', 'string', 'array']
      }, true)

      compare({}, {
        type: []
      }, false)

      compare({
        type: 'string'
      }, {
        type: ['string']
      }, true)
    })
    it('compares equal an empty schema, true and undefined', function() {
      compare({}, true, true)
      compare({}, undefined, true)
      compare(false, false, true)
      compare(true, true, true)
    })
    it('ignores any in ignore list', function() {
      compare({
        title: 'title'
      }, {
        title: 'foobar'
      }, true, {ignore: ['title']})
    })

    it('diffs this', function() {
      compare({
        type: ['string'],
        minLength: 5
      }, {
        type: ['string']
      }, false)
    })
    it('sorts anyOf before comparing', function() {
      compare({
        anyOf: [
          {
            type: 'string'
          }, {
            type: 'integer'
          }
        ]
      }, {
        anyOf: [
          {
            type: 'integer'
          }, {
            type: 'string'
          }
        ]
      }, true)

      compare({
        anyOf: [
          {
            type: 'string'
          }, {
            type: 'integer'
          }
        ]
      }, {
        anyOf: [
          {
            type: 'integer'
          }, {
            type: 'string'
          },
          {
            type: ['string'],
            minLength: 5,
            fdsafads: '34534'
          }
        ]
      }, false)

      compare({
        anyOf: [
          {
            type: 'string'
          }, {
            type: 'integer'
          }
        ]
      }, {
        anyOf: [
          {
            type: 'integer'
          }, {
            type: 'array'
          }
        ]
      }, false)

      compare({
        anyOf: [
          {
            type: 'string'
          }, {
            type: ['string']
          }, {
            type: 'integer'
          }
        ]
      }, {
        anyOf: [
          {
            type: 'integer'
          }, {
            type: 'string'
          }
        ]
      }, true)
    })
    it('sorts allOf before comparing', function() {
      compare({
        allOf: [
          {
            type: 'string'
          }, {
            type: 'integer'
          }
        ]
      }, {
        allOf: [
          {
            type: 'integer'
          }, {
            type: 'string'
          }
        ]
      }, true)

      compare({
        allOf: [
          {
            type: 'string'
          }, {
            type: 'integer'
          }
        ]
      }, {
        allOf: [
          {
            type: 'integer'
          }, {
            type: 'string'
          },
          {
            type: ['string'],
            minLength: 5,
            fdsafads: '34534'
          }
        ]
      }, false)

      compare({
        allOf: [
          {
            type: 'string'
          }, {
            type: 'integer'
          }
        ]
      }, {
        allOf: [
          {
            type: 'integer'
          }, {
            type: 'array'
          }
        ]
      }, false)

      compare({
        allOf: [
          {
            type: 'string'
          }, {
            type: ['string']
          }, {
            type: 'integer'
          }
        ]
      }, {
        allOf: [
          {
            type: 'integer'
          }, {
            type: 'string'
          }
        ]
      }, true)
    })
    it('sorts oneOf before comparing', function() {
      compare({
        oneOf: [
          {
            type: 'string'
          }, {
            type: 'integer'
          }
        ]
      }, {
        oneOf: [
          {
            type: 'integer'
          }, {
            type: 'string'
          }
        ]
      }, true)

      compare({
        oneOf: [
          {
            type: 'string'
          }, {
            type: 'integer'
          }
        ]
      }, {
        oneOf: [
          {
            type: 'integer'
          }, {
            type: 'string'
          },
          {
            type: ['string'],
            minLength: 5,
            fdsafads: '34534'
          }
        ]
      }, false)

      compare({
        oneOf: [
          {
            type: 'string'
          }, {
            type: 'integer'
          }
        ]
      }, {
        oneOf: [
          {
            type: 'integer'
          }, {
            type: 'array'
          }
        ]
      }, false)

      compare({
        oneOf: [
          {
            type: 'string'
          }, {
            type: ['string']
          }, {
            type: 'integer'
          }
        ]
      }, {
        oneOf: [
          {
            type: 'integer'
          }, {
            type: 'string'
          }
        ]
      }, true)
    })
    it('compares enum unsorted', function() {
      compare({
        enum: ['abc', '123']
      }, {
        enum: ['123', 'abc', 'abc']
      }, true)
    })
    it('compares dependencies value if array unsorted', function() {
      compare({
        dependencies: {
          foo: ['abc', '123']
        }
      }, {
        dependencies: {
          foo: ['123', 'abc', 'abc']
        }
      }, true)
    })
    it('compares items SORTED', function() {
      compare({
        items: [true, false]
      }, {
        items: [true, true]
      }, false)

      compare({
        items: [{}, false]
      }, {
        items: [true, false]
      }, true)
    })
    it('compares equal uniqueItems false and undefined', function() {
      compare({
        uniqueItems: false
      }, {}, true)
    })
    it('compares equal minLength undefined and 0', function() {
      compare({
        minLength: 0
      }, {}, true)
    })
    it('compares equal minItems undefined and 0', function() {
      compare({
        minItems: 0
      }, {}, true)
    })
    it('compares equal minProperties undefined and 0', function() {
      compare({
        minProperties: 0
      }, {}, true)
    })
  })

  describe('complete', function() {
    it('includes all properties, like title')
  })
})
