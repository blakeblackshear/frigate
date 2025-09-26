import { makePromise } from './utils.js'
import request from './request.js'

const getDefaults = () => {
  return {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
    addPath: '/locales/add/{{lng}}/{{ns}}',
    parse: data => JSON.parse(data),
    stringify: JSON.stringify,
    parsePayload: (namespace, key, fallbackValue) => ({ [key]: fallbackValue || '' }),
    parseLoadPayload: (languages, namespaces) => undefined,
    request,
    reloadInterval: typeof window !== 'undefined' ? false : 60 * 60 * 1000,
    customHeaders: {},
    queryStringParams: {},
    crossDomain: false, // used for XmlHttpRequest
    withCredentials: false, // used for XmlHttpRequest
    overrideMimeType: false, // used for XmlHttpRequest
    requestOptions: { // used for fetch
      mode: 'cors',
      credentials: 'same-origin',
      cache: 'default'
    }
  }
}

class Backend {
  constructor (services, options = {}, allOptions = {}) {
    this.services = services
    this.options = options
    this.allOptions = allOptions
    this.type = 'backend'
    this.init(services, options, allOptions)
  }

  init (services, options = {}, allOptions = {}) {
    this.services = services
    this.options = { ...getDefaults(), ...(this.options || {}), ...options }
    this.allOptions = allOptions
    if (this.services && this.options.reloadInterval) {
      const timer = setInterval(() => this.reload(), this.options.reloadInterval)
      if (typeof timer === 'object' && typeof timer.unref === 'function') timer.unref()
    }
  }

  readMulti (languages, namespaces, callback) {
    this._readAny(languages, languages, namespaces, namespaces, callback)
  }

  read (language, namespace, callback) {
    this._readAny([language], language, [namespace], namespace, callback)
  }

  _readAny (languages, loadUrlLanguages, namespaces, loadUrlNamespaces, callback) {
    let loadPath = this.options.loadPath
    if (typeof this.options.loadPath === 'function') {
      loadPath = this.options.loadPath(languages, namespaces)
    }

    loadPath = makePromise(loadPath)

    loadPath.then(resolvedLoadPath => {
      if (!resolvedLoadPath) return callback(null, {})
      const url = this.services.interpolator.interpolate(resolvedLoadPath, { lng: languages.join('+'), ns: namespaces.join('+') })
      this.loadUrl(url, callback, loadUrlLanguages, loadUrlNamespaces)
    })
  }

  loadUrl (url, callback, languages, namespaces) {
    const lng = (typeof languages === 'string') ? [languages] : languages
    const ns = (typeof namespaces === 'string') ? [namespaces] : namespaces
    // parseLoadPayload — default undefined
    const payload = this.options.parseLoadPayload(lng, ns)
    this.options.request(this.options, url, payload, (err, res) => {
      if (res && ((res.status >= 500 && res.status < 600) || !res.status)) return callback('failed loading ' + url + '; status code: ' + res.status, true /* retry */)
      if (res && res.status >= 400 && res.status < 500) return callback('failed loading ' + url + '; status code: ' + res.status, false /* no retry */)
      if (!res && err && err.message) {
        const errorMessage = err.message.toLowerCase()
        // for example:
        // Chrome: "Failed to fetch"
        // Firefox: "NetworkError when attempting to fetch resource."
        // Safari: "Load failed"
        const isNetworkError = [
          'failed',
          'fetch',
          'network',
          'load'
        ].find((term) => errorMessage.indexOf(term) > -1)
        if (isNetworkError) {
          return callback('failed loading ' + url + ': ' + err.message, true /* retry */)
        }
      }
      if (err) return callback(err, false)

      let ret, parseErr
      try {
        if (typeof res.data === 'string') {
          ret = this.options.parse(res.data, languages, namespaces)
        } else { // fallback, which omits calling the parse function
          ret = res.data
        }
      } catch (e) {
        parseErr = 'failed parsing ' + url + ' to json'
      }
      if (parseErr) return callback(parseErr, false)
      callback(null, ret)
    })
  }

  create (languages, namespace, key, fallbackValue, callback) {
    // If there is a falsey addPath, then abort -- this has been disabled.
    if (!this.options.addPath) return
    if (typeof languages === 'string') languages = [languages]
    const payload = this.options.parsePayload(namespace, key, fallbackValue)
    let finished = 0
    const dataArray = []
    const resArray = []
    languages.forEach(lng => {
      let addPath = this.options.addPath
      if (typeof this.options.addPath === 'function') {
        addPath = this.options.addPath(lng, namespace)
      }
      const url = this.services.interpolator.interpolate(addPath, { lng, ns: namespace })

      this.options.request(this.options, url, payload, (data, res) => {
        // TODO: if res.status === 4xx do log
        finished += 1
        dataArray.push(data)
        resArray.push(res)
        if (finished === languages.length) {
          if (typeof callback === 'function') callback(dataArray, resArray)
        }
      })
    })
  }

  reload () {
    const { backendConnector, languageUtils, logger } = this.services
    const currentLanguage = backendConnector.language
    if (currentLanguage && currentLanguage.toLowerCase() === 'cimode') return // avoid loading resources for cimode

    const toLoad = []
    const append = (lng) => {
      const lngs = languageUtils.toResolveHierarchy(lng)
      lngs.forEach(l => {
        if (toLoad.indexOf(l) < 0) toLoad.push(l)
      })
    }

    append(currentLanguage)

    if (this.allOptions.preload) this.allOptions.preload.forEach((l) => append(l))

    toLoad.forEach(lng => {
      this.allOptions.ns.forEach(ns => {
        backendConnector.read(lng, ns, 'read', null, null, (err, data) => {
          if (err) logger.warn(`loading namespace ${ns} for language ${lng} failed`, err)
          if (!err && data) logger.log(`loaded namespace ${ns} for language ${lng}`, data)

          backendConnector.loaded(`${lng}|${ns}`, err, data)
        })
      })
    })
  }
}

Backend.type = 'backend'

export default Backend
