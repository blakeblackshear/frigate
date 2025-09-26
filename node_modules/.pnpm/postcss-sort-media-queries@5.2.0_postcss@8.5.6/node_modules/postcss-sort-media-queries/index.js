function sortAtRules(queries, sort, sortCSSmq) {
  if (typeof sort !== 'function') {
    sort = sort === 'desktop-first' ? sortCSSmq.desktopFirst : sortCSSmq
  }

  return queries.sort(sort)
}

module.exports = (opts = {}) => {

  opts = Object.assign(
    {
      sort: 'mobile-first',
      configuration: false,
      onlyTopLevel: false,
    },
    opts
  )

  const createSort = require('sort-css-media-queries/lib/create-sort');
  const sortCSSmq = opts.configuration ? createSort(opts.configuration) : require('sort-css-media-queries');

  return {
    postcssPlugin: 'postcss-sort-media-queries',
    OnceExit (root, { AtRule }) {

      let atRules = [];

      root.walkAtRules('media', atRule => {
        if (opts.onlyTopLevel && atRule.parent.type === 'root') {
          let query = atRule.params

          if (!atRules[query]) {
            atRules[query] = new AtRule({
              name: atRule.name,
              params: atRule.params,
              source: atRule.source
            })
          }

          atRule.nodes.forEach(node => {
            atRules[query].append(node.clone())
          })

          atRule.remove()
        }

        if (!opts.onlyTopLevel) {
          let query = atRule.params

          if (!atRules[query]) {
            atRules[query] = new AtRule({
              name: atRule.name,
              params: atRule.params,
              source: atRule.source
            })
          }

          atRule.nodes.forEach(node => {
            atRules[query].append(node.clone())
          })

          atRule.remove()
        }
      })

      if (atRules) {
        sortAtRules(Object.keys(atRules), opts.sort, sortCSSmq).forEach(query => {
          root.append(atRules[query])
        })
      }
    }
  }
}
module.exports.postcss = true
