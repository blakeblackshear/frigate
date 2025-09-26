'use strict'

const fs = require('fs')
const path = require('path')
const escalade = require('escalade/sync')
const stripJSONComments = require('strip-json-comments')

let config = {}
const configSources = ['package.json', '.rtlcssrc', '.rtlcss.json']
const environments = [
  process.env.USERPROFILE,
  process.env.HOMEPATH,
  process.env.HOME
]

module.exports.load = (configFilePath, cwd, overrides) => {
  if (configFilePath) {
    return override(readConfig(configFilePath), overrides)
  }

  const directory = cwd || process.cwd()
  config = loadConfig(directory)

  if (!config) {
    for (const environment of environments) {
      if (!environment) {
        continue
      }

      config = loadConfig(environment)
      if (config) {
        break
      }
    }
  }

  if (config) {
    override(config, overrides)
  }

  return config
}

function readConfig (configFilePath) {
  try {
    const data = fs.readFileSync(path.normalize(configFilePath), 'utf-8')
    return JSON.parse(stripJSONComments(data.trim()))
  } catch (error) {
    throw new Error(`${error} ${configFilePath}`)
  }
}

function loadConfig (cwd) {
  for (const source of configSources) {
    const foundPath = escalade(cwd, (dir, names) => names.includes(source) && source)

    if (foundPath) {
      config = readConfig(foundPath)

      if (source === 'package.json') {
        config = config.rtlcssConfig
      }

      if (config) {
        return config
      }
    }
  }
}

function override (to, from) {
  if (to && from) {
    for (const p in from) {
      if (Object.prototype.hasOwnProperty.call(from, p)) {
        if (Object.prototype.hasOwnProperty.call(to, p) && typeof to[p] === 'object') {
          override(to[p], from[p])
        } else {
          to[p] = from[p]
        }
      }
    }
  }

  return to
}
