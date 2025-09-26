const chai = require('chai')
const merger = require('../../src')
const _ = require('lodash')
const $RefParser = require('json-schema-ref-parser')
const metaSchema = require('../fixtures/schemas/meta-schema-v6.json')

const expect = chai.expect
let schema
describe.skip('simplify the meta schema', function() {
  beforeEach(function() {
    return $RefParser.dereference(_.cloneDeep(metaSchema)).then(function(dereferenced) {
      schema = dereferenced
    })
  })

  it('simplifies', function() {
    const result = merger(_.cloneDeep(schema))
    expect(result).to.eql(schema)
  })
})
