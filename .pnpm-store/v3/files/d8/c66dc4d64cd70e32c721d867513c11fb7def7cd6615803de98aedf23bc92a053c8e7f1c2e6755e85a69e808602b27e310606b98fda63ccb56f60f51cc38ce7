const chai = require('chai')
const merger = require('../../src')
const expect = chai.expect

describe('simple resolver', () => {
  it('merges as expected (with enum)', () => {
    const result = merger({
      enum: [1, 2],
      allOf: [{
        enum: [2, 3]
      }]
    })

    expect(result).to.eql({
      enum: [2]
    })

    const opts = {
      resolvers: {
        enum(schemas, paths, mergeSchemas, options) {
          expect(options).to.eql(opts)
          expect(schemas).to.have.length(2)
          expect(paths).to.have.length(1)
          expect(paths).to.eql(['enum'])

          // inner merge test
          const innerSchemas = [{
            minLength: 1
          }, {
            minLength: 7
          }]

          const innerResult = mergeSchemas(innerSchemas)
          expect(innerResult).to.eql({
            minLength: 7
          })

          return [5]
        }
      }
    }

    const resultCustom = merger({
      enum: [1, 2],
      allOf: [{
        enum: [2, 3]
      }]
    }, opts)

    expect(resultCustom).to.eql({
      enum: [5]
    })
  })

  describe('group resolvers', () => {
    it('works as intended with if then else copy resolver', () => {
      const conditonalRelated = ['if', 'then', 'else']
      const has = (obj, propName) => Object.prototype.hasOwnProperty.call(obj, propName)
      const opts = {
        complexResolvers: {
          if: {
            // test with same if-then-else resolver
            keywords: conditonalRelated,
            resolver(schemas, paths, mergers, options) {
              const allWithConditional = schemas.filter(schema =>
                conditonalRelated.some(keyword => has(schema, keyword)))

              // merge sub schemas completely
              // if,then,else must not be merged to the base schema, but if they contain allOf themselves, that should be merged
              function merge(schema) {
                const obj = {}
                if (has(schema, 'if')) obj.if = mergers.if([schema.if])
                if (has(schema, 'then')) obj.then = mergers.then([schema.then])
                if (has(schema, 'else')) obj.else = mergers.else([schema.else])
                return obj
              }

              // first schema with any of the 3 keywords is used as base
              const first = merge(allWithConditional.shift())
              return allWithConditional.reduce((all, schema) => {
                all.allOf = (all.allOf || []).concat(merge(schema))
                return all
              }, first)
            }
          }
        }
      }

      const resultCustom = merger({
        allOf: [{
          if: {
            required: ['def']
          },
          then: {},
          else: {}
        }]
      }, opts)

      expect(resultCustom).to.eql({
        if: {
          required: ['def']
        },
        then: {},
        else: {}
      })
    })
  })
})
