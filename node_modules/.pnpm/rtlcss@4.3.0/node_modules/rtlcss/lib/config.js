'use strict'

const corePlugin = require('./plugin.js')

const defaultOptions = {
  autoRename: false,
  autoRenameStrict: false,
  blacklist: {},
  clean: true,
  greedy: false,
  processUrls: false,
  stringMap: [],
  useCalc: false,
  aliases: {},
  processEnv: true
}

function sort (arr) {
  return arr.sort((a, b) => a.priority - b.priority)
}

function setupStringMap (stringMap) {
  if (!Array.isArray(stringMap)) {
    return
  }

  let hasLeftRight = false
  let hasLtrRtl = false

  for (const map of stringMap) {
    if (hasLeftRight && hasLtrRtl) {
      break
    } else if (map.name === 'left-right') {
      hasLeftRight = true
    } else if (map.name === 'ltr-rtl') {
      hasLtrRtl = true
    }
  }

  if (!hasLeftRight) {
    stringMap.push({
      name: 'left-right',
      priority: 100,
      exclusive: false,
      search: ['left', 'Left', 'LEFT'],
      replace: ['right', 'Right', 'RIGHT'],
      options: { scope: '*', ignoreCase: false }
    })
  }

  if (!hasLtrRtl) {
    stringMap.push({
      name: 'ltr-rtl',
      priority: 100,
      exclusive: false,
      search: ['ltr', 'Ltr', 'LTR'],
      replace: ['rtl', 'Rtl', 'RTL'],
      options: { scope: '*', ignoreCase: false }
    })
  }

  return sort(stringMap)
}

function setupPlugins (plugins) {
  const newPlugins = []

  if (!plugins || !plugins.some((plugin) => plugin.name === 'rtlcss')) {
    newPlugins.push(corePlugin)
  }

  return sort([...newPlugins, ...plugins])
}

function setupHooks (hooks) {
  const newHooks = {
    pre () {},
    post () {}
  }

  if (typeof hooks.pre === 'function') {
    newHooks.pre = hooks.pre
  }

  if (typeof hooks.post === 'function') {
    newHooks.post = hooks.post
  }

  return newHooks
}

module.exports.configure = (opts = {}, plugins = [], hooks = {}) => {
  const config = { ...defaultOptions, ...opts }

  // string map
  config.stringMap = setupStringMap(config.stringMap)
  // plugins
  config.plugins = setupPlugins(plugins)
  // hooks
  config.hooks = setupHooks(hooks)

  return config
}
