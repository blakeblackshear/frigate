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
      configuration: {
        unitlessMqAlwaysFirst: false,
      },
    },
    opts
  )

  const createSort = require('sort-css-media-queries/lib/create-sort');
  const sortCSSmq = createSort(opts.configuration);

  return {
    postcssPlugin: 'postcss-sort-media-queries',
    OnceExit(root, { AtRule }) {

      let atRules = [];

      root.walkAtRules('media', atRule => {
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
      })

      sortAtRules(Object.keys(atRules), opts.sort, sortCSSmq).forEach(query => {
        root.append(atRules[query])
      })
    }
  }
}
module.exports.postcss = true
