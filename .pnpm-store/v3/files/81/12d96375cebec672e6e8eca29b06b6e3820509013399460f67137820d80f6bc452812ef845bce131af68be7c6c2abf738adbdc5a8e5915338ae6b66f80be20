const chai = require('chai')
const merger = require('../../src')

const expect = chai.expect

describe('options', function() {
  it('allows otherwise incompatible properties if option ignoreAdditionalProperties is true', function() {
    const result = merger({
      allOf: [{
        properties: {
          foo: true
        },
        additionalProperties: true
      }, {
        properties: {
          bar: true
        },
        additionalProperties: false
      }]
    }, {
      ignoreAdditionalProperties: true
    })

    expect(result).to.eql({
      properties: {
        foo: true,
        bar: true
      },
      additionalProperties: false
    })

    const result2 = merger({
      allOf: [{
        additionalProperties: true
      }, {
        additionalProperties: true
      }]
    })

    expect(result2).to.eql({})
  })

  it('ignoreAdditionalProperties is true, also allows merging of patternProperties', function() {
    const result = merger({
      allOf: [{
        properties: {
          foo: true
        },
        patternProperties: {
          '^abc': true
        },
        additionalProperties: true
      }, {
        properties: {
          bar: true
        },
        patternProperties: {
          '123$': true
        },
        additionalProperties: false
      }]
    }, {
      ignoreAdditionalProperties: true
    })

    expect(result).to.eql({
      properties: {
        foo: true,
        bar: true
      },
      patternProperties: {
        '^abc': true,
        '123$': true
      },
      additionalProperties: false
    })

    const result2 = merger({
      allOf: [{
        additionalProperties: true
      }, {
        additionalProperties: true
      }]
    })

    expect(result2).to.eql({})
  })

  it('throws if no resolver found for unknown keyword', function() {
    expect(function() {
      merger({
        foo: 3,
        allOf: [{
          foo: 7
        }]
      })
    }).to.throw(/no resolver found/i)
  })

  it('uses supplied resolver for unknown keyword', function() {
    const result = merger({
      foo: 3,
      allOf: [{
        foo: 7
      }]
    }, {
      resolvers: {
        foo: function(values) {
          return values.pop()
        }
      }
    })

    expect(result).to.eql({
      foo: 7
    })
  })

  it('uses default merger if no resolver found', function() {
    const result = merger({
      foo: 3,
      allOf: [{
        foo: 7
      }]
    }, {
      resolvers: {
        defaultResolver: function(values) {
          return values.pop()
        }
      }
    })

    expect(result).to.eql({
      foo: 7
    })
  })

  it('merges deep by default', function() {
    const result = merger({
      allOf: [{
        properties: {
          foo: { type: 'string' },
          bar: {
            allOf: [{
              properties: {
                baz: { type: 'string' }
              }
            }]
          }
        }
      }]
    })

    expect(result).to.eql({
      properties: {
        foo: { type: 'string' },
        bar: {
          properties: {
            baz: { type: 'string' }
          }
        }
      }
    })
  })

  it('doesn\'t merge deep when deep is false', function() {
    const result = merger({
      allOf: [{
        properties: {
          foo: { type: 'string' },
          bar: {
            allOf: [{
              properties: {
                baz: { type: 'string' }
              }
            }]
          }
        }
      }]
    }, { deep: false })

    expect(result).to.eql({
      properties: {
        foo: { type: 'string' },
        bar: {
          allOf: [{
            properties: {
              baz: { type: 'string' }
            }
          }]
        }
      }
    })
  })
})
