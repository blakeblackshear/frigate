/*
 ** Generic functions which are not dependent on ApexCharts
 */

class Utils {
  static bind(fn, me) {
    return function () {
      return fn.apply(me, arguments)
    }
  }

  static isObject(item) {
    return (
      item && typeof item === 'object' && !Array.isArray(item) && item != null
    )
  }

  // Type checking that works across different window objects
  static is(type, val) {
    return Object.prototype.toString.call(val) === '[object ' + type + ']'
  }

  static listToArray(list) {
    let i,
      array = []
    for (i = 0; i < list.length; i++) {
      array[i] = list[i]
    }
    return array
  }

  // to extend defaults with user options
  // credit: http://stackoverflow.com/questions/27936772/deep-object-merging-in-es6-es7#answer-34749873
  static extend(target, source) {
    if (typeof Object.assign !== 'function') {
      ;(function () {
        Object.assign = function (target) {
          'use strict'
          // We must check against these specific cases.
          if (target === undefined || target === null) {
            throw new TypeError('Cannot convert undefined or null to object')
          }

          let output = Object(target)
          for (let index = 1; index < arguments.length; index++) {
            let source = arguments[index]
            if (source !== undefined && source !== null) {
              for (let nextKey in source) {
                if (source.hasOwnProperty(nextKey)) {
                  output[nextKey] = source[nextKey]
                }
              }
            }
          }
          return output
        }
      })()
    }

    let output = Object.assign({}, target)
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach((key) => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, {
              [key]: source[key],
            })
          } else {
            output[key] = this.extend(target[key], source[key])
          }
        } else {
          Object.assign(output, {
            [key]: source[key],
          })
        }
      })
    }
    return output
  }

  static extendArray(arrToExtend, resultArr) {
    let extendedArr = []
    arrToExtend.map((item) => {
      extendedArr.push(Utils.extend(resultArr, item))
    })
    arrToExtend = extendedArr
    return arrToExtend
  }

  // If month counter exceeds 12, it starts again from 1
  static monthMod(month) {
    return month % 12
  }

  static clone(source) {
    if (Utils.is('Array', source)) {
      let cloneResult = []
      for (let i = 0; i < source.length; i++) {
        cloneResult[i] = this.clone(source[i])
      }
      return cloneResult
    } else if (Utils.is('Null', source)) {
      // fixes an issue where null values were converted to {}
      return null
    } else if (Utils.is('Date', source)) {
      return source
    } else if (typeof source === 'object') {
      let cloneResult = {}
      for (let prop in source) {
        if (source.hasOwnProperty(prop)) {
          cloneResult[prop] = this.clone(source[prop])
        }
      }
      return cloneResult
    } else {
      return source
    }
  }

  static log10(x) {
    return Math.log(x) / Math.LN10
  }

  static roundToBase10(x) {
    return Math.pow(10, Math.floor(Math.log10(x)))
  }

  static roundToBase(x, base) {
    return Math.pow(base, Math.floor(Math.log(x) / Math.log(base)))
  }

  static parseNumber(val) {
    if (val === null) return val
    return parseFloat(val)
  }

  static stripNumber(num, precision = 2) {
    return Number.isInteger(num) ? num : parseFloat(num.toPrecision(precision))
  }

  static randomId() {
    return (Math.random() + 1).toString(36).substring(4)
  }

  static noExponents(val) {
    let data = String(val).split(/[eE]/)
    if (data.length === 1) return data[0]

    let z = '',
      sign = val < 0 ? '-' : '',
      str = data[0].replace('.', ''),
      mag = Number(data[1]) + 1

    if (mag < 0) {
      z = sign + '0.'
      while (mag++) z += '0'
      return z + str.replace(/^-/, '')
    }
    mag -= str.length
    while (mag--) z += '0'
    return str + z
  }

  static getDimensions(el) {
    const computedStyle = getComputedStyle(el, null)

    let elementHeight = el.clientHeight
    let elementWidth = el.clientWidth
    elementHeight -=
      parseFloat(computedStyle.paddingTop) +
      parseFloat(computedStyle.paddingBottom)
    elementWidth -=
      parseFloat(computedStyle.paddingLeft) +
      parseFloat(computedStyle.paddingRight)

    return [elementWidth, elementHeight]
  }

  static getBoundingClientRect(element) {
    const rect = element.getBoundingClientRect()
    return {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: element.clientWidth,
      height: element.clientHeight,
      x: rect.left,
      y: rect.top,
    }
  }

  static getLargestStringFromArr(arr) {
    return arr.reduce((a, b) => {
      if (Array.isArray(b)) {
        b = b.reduce((aa, bb) => (aa.length > bb.length ? aa : bb))
      }
      return a.length > b.length ? a : b
    }, 0)
  }

  // http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb#answer-12342275
  static hexToRgba(hex = '#999999', opacity = 0.6) {
    if (hex.substring(0, 1) !== '#') {
      hex = '#999999'
    }

    let h = hex.replace('#', '')
    h = h.match(new RegExp('(.{' + h.length / 3 + '})', 'g'))

    for (let i = 0; i < h.length; i++) {
      h[i] = parseInt(h[i].length === 1 ? h[i] + h[i] : h[i], 16)
    }

    if (typeof opacity !== 'undefined') h.push(opacity)

    return 'rgba(' + h.join(',') + ')'
  }

  static getOpacityFromRGBA(rgba) {
    return parseFloat(rgba.replace(/^.*,(.+)\)/, '$1'))
  }

  static rgb2hex(rgb) {
    rgb = rgb.match(
      /^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i
    )
    return rgb && rgb.length === 4
      ? '#' +
          ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
          ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
          ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2)
      : ''
  }

  shadeRGBColor(percent, color) {
    let f = color.split(','),
      t = percent < 0 ? 0 : 255,
      p = percent < 0 ? percent * -1 : percent,
      R = parseInt(f[0].slice(4), 10),
      G = parseInt(f[1], 10),
      B = parseInt(f[2], 10)
    return (
      'rgb(' +
      (Math.round((t - R) * p) + R) +
      ',' +
      (Math.round((t - G) * p) + G) +
      ',' +
      (Math.round((t - B) * p) + B) +
      ')'
    )
  }

  shadeHexColor(percent, color) {
    let f = parseInt(color.slice(1), 16),
      t = percent < 0 ? 0 : 255,
      p = percent < 0 ? percent * -1 : percent,
      R = f >> 16,
      G = (f >> 8) & 0x00ff,
      B = f & 0x0000ff
    return (
      '#' +
      (
        0x1000000 +
        (Math.round((t - R) * p) + R) * 0x10000 +
        (Math.round((t - G) * p) + G) * 0x100 +
        (Math.round((t - B) * p) + B)
      )
        .toString(16)
        .slice(1)
    )
  }

  // beautiful color shading blending code
  // http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
  shadeColor(p, color) {
    if (Utils.isColorHex(color)) {
      return this.shadeHexColor(p, color)
    } else {
      return this.shadeRGBColor(p, color)
    }
  }

  static isColorHex(color) {
    return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)|(^#[0-9A-F]{8}$)/i.test(color)
  }

  static getPolygonPos(size, dataPointsLen) {
    let dotsArray = []
    let angle = (Math.PI * 2) / dataPointsLen
    for (let i = 0; i < dataPointsLen; i++) {
      let curPos = {}
      curPos.x = size * Math.sin(i * angle)
      curPos.y = -size * Math.cos(i * angle)
      dotsArray.push(curPos)
    }
    return dotsArray
  }

  static polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    let angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0

    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    }
  }

  static escapeString(str, escapeWith = 'x') {
    let newStr = str.toString().slice()
    newStr = newStr.replace(
      /[` ~!@#$%^&*()|+\=?;:'",.<>{}[\]\\/]/gi,
      escapeWith
    )
    return newStr
  }

  static negToZero(val) {
    return val < 0 ? 0 : val
  }

  static moveIndexInArray(arr, old_index, new_index) {
    if (new_index >= arr.length) {
      let k = new_index - arr.length + 1
      while (k--) {
        arr.push(undefined)
      }
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0])
    return arr
  }

  static extractNumber(s) {
    return parseFloat(s.replace(/[^\d.]*/g, ''))
  }

  static findAncestor(el, cls) {
    while ((el = el.parentElement) && !el.classList.contains(cls));
    return el
  }

  static setELstyles(el, styles) {
    for (let key in styles) {
      if (styles.hasOwnProperty(key)) {
        el.style.key = styles[key]
      }
    }
  }
  // prevents JS prevision errors when adding
  static preciseAddition(a, b) {
    let aDecimals = (String(a).split('.')[1] || '').length
    let bDecimals = (String(b).split('.')[1] || '').length

    let factor = Math.pow(10, Math.max(aDecimals, bDecimals))

    return (Math.round(a * factor) + Math.round(b * factor)) / factor
  }

  static isNumber(value) {
    return (
      !isNaN(value) &&
      parseFloat(Number(value)) === value &&
      !isNaN(parseInt(value, 10))
    )
  }

  static isFloat(n) {
    return Number(n) === n && n % 1 !== 0
  }

  static isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  }

  static isFirefox() {
    return navigator.userAgent.toLowerCase().indexOf('firefox') > -1
  }

  static isMsEdge() {
    let ua = window.navigator.userAgent

    let edge = ua.indexOf('Edge/')
    if (edge > 0) {
      // Edge (IE 12+) => return version number
      return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10)
    }

    // other browser
    return false
  }
  //
  // Find the Greatest Common Divisor of two numbers
  //
  static getGCD(a, b, p = 7) {
    let big = Math.pow(10, p - Math.floor(Math.log10(Math.max(a, b))))
    a = Math.round(Math.abs(a) * big)
    b = Math.round(Math.abs(b) * big)

    while (b) {
      let t = b
      b = a % b
      a = t
    }
    return a / big
  }

  static getPrimeFactors(n) {
    const factors = []
    let divisor = 2

    while (n >= 2) {
      if (n % divisor == 0) {
        factors.push(divisor)
        n = n / divisor
      } else {
        divisor++
      }
    }
    return factors
  }

  static mod(a, b, p = 7) {
    let big = Math.pow(10, p - Math.floor(Math.log10(Math.max(a, b))))
    a = Math.round(Math.abs(a) * big)
    b = Math.round(Math.abs(b) * big)

    return (a % b) / big
  }
}

export default Utils
