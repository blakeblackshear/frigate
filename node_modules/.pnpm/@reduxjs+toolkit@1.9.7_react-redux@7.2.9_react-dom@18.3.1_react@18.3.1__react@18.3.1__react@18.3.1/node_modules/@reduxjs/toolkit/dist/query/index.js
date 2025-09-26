'use strict'
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./rtk-query.cjs.production.min.js')
} else {
  module.exports = require('./rtk-query.cjs.development.js')
}