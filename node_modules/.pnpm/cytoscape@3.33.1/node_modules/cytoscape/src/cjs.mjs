// an entrypoint to use the raw source in cjs projects
// e.g. require('cytoscape/src/cjs') or setting an alias in your build tool of 'cytoscape':'cytoscape/src/cjs'

module.exports = require('./index.js').default;
