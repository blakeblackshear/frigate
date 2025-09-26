'use strict'

const config = require('./config.js')
const util = require('./util.js')

module.exports = {
  name: 'rtlcss',
  priority: 100,
  directives: {
    control: {
      ignore: {
        expect: { atrule: true, comment: true, decl: true, rule: true },
        endNode: null,
        begin (node, metadata, context) {
          // find the ending node in case of self-closing directive
          if (this.endNode === null && metadata.begin && metadata.end) {
            let n = node
            while (n && n.nodes) {
              n = n.nodes[n.nodes.length - 1]
            }

            this.endNode = n
          }

          return node.type !== 'comment' || !/^\s*!?\s*rtl:end:ignore/.test(node.text)
        },
        end (node, metadata, context) {
          // end if:
          //  1. block directive and the node is comment
          //  2. self-closing directive and node is endNode
          if ((metadata.begin !== metadata.end && node.type === 'comment') || (metadata.begin && metadata.end && node === this.endNode)) {
            // clear ending node
            this.endNode = null
            return true
          }

          return false
        }
      },
      rename: {
        expect: { rule: true },
        begin (node, metadata, context) {
          node.selector = context.util.applyStringMap(node.selector, false)
          return false
        },
        end (node, context) {
          return true
        }
      },
      raw: {
        expect: { self: true },
        begin (node, metadata, context) {
          const nodes = context.postcss.parse(metadata.param, { from: node.source.input.from })
          nodes.walk((node) => {
            node[context.symbol] = true
          })
          node.parent.insertBefore(node, nodes)
          return true
        },
        end (node, context) {
          return true
        }
      },
      remove: {
        expect: { atrule: true, rule: true, decl: true },
        begin (node, metadata, context) {
          let prevent = false
          switch (node.type) {
            case 'atrule':
            case 'rule':
            case 'decl':
              prevent = true
              node.remove()
          }

          return prevent
        },
        end (node, metadata, context) {
          return true
        }
      },
      options: {
        expect: { self: true },
        stack: [],
        begin (node, metadata, context) {
          this.stack.push(util.extend({}, context.config))
          let options
          try {
            options = JSON.parse(metadata.param)
          } catch (e) {
            throw node.error('Invalid options object', { details: e })
          }

          context.config = config.configure(options, context.config.plugins)
          context.util = util.configure(context.config)
          return true
        },
        end (node, metadata, context) {
          const config = this.stack.pop()
          if (config && !metadata.begin) {
            context.config = config
            context.util = util.configure(context.config)
          }

          return true
        }
      },
      config: {
        expect: { self: true },
        stack: [],
        begin (node, metadata, context) {
          this.stack.push(util.extend({}, context.config))
          let configuration
          try {
            configuration = eval(`(${metadata.param})`) // eslint-disable-line no-eval
          } catch (e) {
            throw node.error('Invalid config object', { details: e })
          }

          context.config = config.configure(configuration.options, configuration.plugins)
          context.util = util.configure(context.config)
          return true
        },
        end (node, metadata, context) {
          const config = this.stack.pop()
          if (config && !metadata.begin) {
            context.config = config
            context.util = util.configure(context.config)
          }

          return true
        }
      }
    },
    value: [
      {
        name: 'ignore',
        action (decl, expr, context) {
          return true
        }
      },
      {
        name: 'prepend',
        action (decl, expr, context) {
          let prefix = ''
          const hasRawValue = decl.raws.value && decl.raws.value.raw
          const raw = `${decl.raws.between.substr(1).trim()}${hasRawValue ? decl.raws.value.raw : decl.value}${decl.important ? decl.raws.important.substr(9).trim() : ''}`
          raw.replace(expr, (m, v) => {
            prefix += v
          })
          decl.value = hasRawValue
            ? (decl.raws.value.raw = prefix + decl.raws.value.raw)
            : prefix + decl.value
          return true
        }
      },
      {
        name: 'append',
        action (decl, expr, context) {
          let suffix = ''
          const hasRawValue = decl.raws.value && decl.raws.value.raw
          const raw = `${decl.raws.between.substr(1).trim()}${hasRawValue ? decl.raws.value.raw : decl.value}${decl.important ? decl.raws.important.substr(9).trim() : ''}`
          raw.replace(expr, (m, v) => {
            suffix = v + suffix
          })
          decl.value = hasRawValue ? (decl.raws.value.raw += suffix) : decl.value + suffix
          return true
        }
      },
      {
        name: 'insert',
        action (decl, expr, context) {
          const hasRawValue = decl.raws.value && decl.raws.value.raw
          const raw = `${decl.raws.between.substr(1).trim()}${hasRawValue ? decl.raws.value.raw : decl.value}${decl.important ? decl.raws.important.substr(9).trim() : ''}`
          const result = raw.replace(expr, (match, value) => value + match)
          decl.value = hasRawValue ? (decl.raws.value.raw = result) : result
          return true
        }
      },
      {
        name: '',
        action (decl, expr, context) {
          const hasRawValue = decl.raws.value && decl.raws.value.raw
          const raw = `${decl.raws.between.substr(1).trim()}${hasRawValue ? decl.raws.value.raw : ''}${decl.important ? decl.raws.important.substr(9).trim() : ''}`
          raw.replace(expr, (match, value) => {
            decl.value = hasRawValue
              ? (decl.raws.value.raw = value + match)
              : value
          })
          return true
        }
      }
    ]
  },
  processors: [
    {
      name: 'variable',
      expr: /^--/im,
      action (prop, value) {
        return { prop, value }
      }
    },
    {
      name: 'direction',
      expr: /direction/im,
      action (prop, value, context) {
        return { prop, value: context.util.swapLtrRtl(value) }
      }
    },
    {
      name: 'left',
      expr: /left/im,
      action (prop, value, context) {
        return { prop: prop.replace(this.expr, 'right'), value }
      }
    },
    {
      name: 'right',
      expr: /right/im,
      action (prop, value, context) {
        return { prop: prop.replace(this.expr, 'left'), value }
      }
    },
    {
      name: 'four-value syntax',
      expr: /^(margin|padding|border-(color|style|width))$/ig,
      cache: null,
      action (prop, value, context) {
        if (this.cache === null) {
          this.cache = {
            match: /[^\s\uFFFD]+/g
          }
        }

        const state = context.util.guardFunctions(value)
        const result = state.value.match(this.cache.match)
        if (result && result.length === 4 && (state.store.length > 0 || result[1] !== result[3])) {
          let i = 0
          state.value = state.value.replace(this.cache.match, () => result[(4 - i++) % 4])
        }

        return { prop, value: context.util.unguardFunctions(state) }
      }
    },
    {
      name: 'border radius',
      expr: /border-radius/ig,
      cache: null,
      flip (value) {
        const parts = value.match(this.cache.match)
        if (!parts) return value

        let i
        switch (parts.length) {
          case 2:
            i = 1
            if (parts[0] !== parts[1]) {
              value = value.replace(this.cache.match, () => parts[i--])
            }

            break
          case 3:
            // preserve leading whitespace.
            value = value.replace(this.cache.white, (m) => `${m + parts[1]} `)
            break
          case 4:
            i = 0
            if (parts[0] !== parts[1] || parts[2] !== parts[3]) {
              value = value.replace(this.cache.match, () => parts[(5 - i++) % 4])
            }

            break
        }

        return value
      },
      action (prop, value, context) {
        if (this.cache === null) {
          this.cache = {
            match: /[^\s\uFFFD]+/g,
            slash: /[^/]+/g,
            white: /(^\s*)/
          }
        }

        const state = context.util.guardFunctions(value)
        state.value = state.value.replace(this.cache.slash, (m) => this.flip(m))
        return { prop, value: context.util.unguardFunctions(state) }
      }
    },
    {
      name: 'shadow',
      expr: /shadow/ig,
      cache: null,
      action (prop, value, context) {
        if (this.cache === null) {
          this.cache = {
            replace: /[^,]+/g
          }
        }

        const colorSafe = context.util.guardHexColors(value)
        const funcSafe = context.util.guardFunctions(colorSafe.value)
        funcSafe.value = funcSafe.value.replace(this.cache.replace, (m) => context.util.negate(m))
        colorSafe.value = context.util.unguardFunctions(funcSafe)
        return { prop, value: context.util.unguardHexColors(colorSafe) }
      }
    },
    {
      name: 'transform and perspective origin',
      expr: /(?:transform|perspective)-origin/ig,
      cache: null,
      flip (value, context) {
        if (value === '0') {
          value = '100%'
        } else if (value.match(this.cache.percent)) {
          value = context.util.complement(value)
        } else if (value.match(this.cache.length)) {
          value = context.util.flipLength(value)
        }

        return value
      },
      action (prop, value, context) {
        if (this.cache === null) {
          this.cache = {
            match: context.util.regex(['func', 'percent', 'length'], 'g'),
            percent: context.util.regex(['func', 'percent'], 'i'),
            length: context.util.regex(['length'], 'gi'),
            xKeyword: /(left|right|center)/i
          }
        }

        if (value.match(this.cache.xKeyword)) {
          value = context.util.swapLeftRight(value)
        } else {
          const state = context.util.guardFunctions(value)
          const parts = state.value.match(this.cache.match)
          if (parts && parts.length > 0) {
            parts[0] = this.flip(parts[0], context)
            state.value = state.value.replace(this.cache.match, () => parts.shift())
            value = context.util.unguardFunctions(state)
          }
        }

        return { prop, value }
      }
    },
    {
      name: 'transform',
      expr: /^(?!text-).*?transform$/ig,
      cache: null,
      flip (value, process, context) {
        let i = 0
        return value.replace(this.cache.unit, (num) => process(++i, num))
      },
      flipMatrix (value, context) {
        return this.flip(
          value,
          (i, num) => i === 2 || i === 3 || i === 5 ? context.util.negate(num) : num,
          context
        )
      },
      flipMatrix3D (value, context) {
        return this.flip(
          value,
          (i, num) => i === 2 || i === 4 || i === 5 || i === 13 ? context.util.negate(num) : num,
          context
        )
      },
      flipRotate3D (value, context) {
        return this.flip(
          value,
          (i, num) => i === 1 || i === 4 ? context.util.negate(num) : num,
          context
        )
      },
      action (prop, value, context) {
        if (this.cache === null) {
          this.cache = {
            negatable: /((translate)(x|3d)?|rotate(z|y)?)$/ig,
            unit: context.util.regex(['func', 'number'], 'g'),
            matrix: /matrix$/i,
            matrix3D: /matrix3d$/i,
            skewXY: /skew(x|y)?$/i,
            rotate3D: /rotate3d$/i
          }
        }

        const state = context.util.guardFunctions(value)
        return {
          prop,
          value: context.util.unguardFunctions(state, (v, n) => {
            if (n.length === 0) return v

            if (n.match(this.cache.matrix3D)) {
              v = this.flipMatrix3D(v, context)
            } else if (n.match(this.cache.matrix)) {
              v = this.flipMatrix(v, context)
            } else if (n.match(this.cache.rotate3D)) {
              v = this.flipRotate3D(v, context)
            } else if (n.match(this.cache.skewXY)) {
              v = context.util.negateAll(v)
            } else if (n.match(this.cache.negatable)) {
              v = context.util.negate(v)
            }

            return v
          })
        }
      }
    },
    {
      name: 'transition',
      expr: /transition(-property)?$/i,
      action (prop, value, context) {
        return { prop, value: context.util.swapLeftRight(value) }
      }
    },
    {
      name: 'background',
      expr: /(background|object)(-position(-x)?|-image)?$/i,
      cache: null,
      flip (value, context, isPositionX) {
        const state = util.saveTokens(value, true)
        const parts = state.value.match(this.cache.match)

        if (!parts || parts.length === 0) return util.restoreTokens(state)

        const keywords = (state.value.match(this.cache.position) || '').length
        if (/* edge offsets */ parts.length >= 3 || /* keywords only */ keywords === 2) {
          state.value = util.swapLeftRight(state.value)
        } else {
          if (parts[0] === '0') {
            parts[0] = '100%'
          } else if (parts[0].match(this.cache.percent)) {
            parts[0] = context.util.complement(parts[0])
          } else if (parts[0].match(this.cache.length)) {
            if (isPositionX) {
              parts[0] = context.util.flipLength(parts[0])
            } else if (parts.length === 1) { // X 50% ==> left X top 50%
              parts[0] = `right ${parts[0]} top 50%`
            } else if (!keywords && parts.length === 2) { // X Y ==> left X top Y
              parts[0] = `right ${parts[0]}`
              parts[1] = `top ${parts[1]}`
            }
          } else {
            parts[0] = context.util.swapLeftRight(parts[0])
          }
          state.value = state.value.replace(this.cache.match, () => parts.shift())
        }

        return util.restoreTokens(state)
      },
      update (context, value, name) {
        if (name.match(this.cache.gradient)) {
          value = context.util.swapLeftRight(value)
          if (value.match(this.cache.angle)) {
            value = context.util.negate(value)
          }
        } else if ((context.config.processUrls === true || context.config.processUrls.decl === true) && name.match(this.cache.url)) {
          value = context.util.applyStringMap(value, true)
        }
        return value
      },
      action (prop, value, context) {
        if (this.cache === null) {
          this.cache = {
            match: context.util.regex(['position', 'percent', 'length', 'calc'], 'ig'),
            percent: context.util.regex(['func', 'percent'], 'i'),
            position: context.util.regex(['position'], 'g'),
            length: context.util.regex(['length'], 'gi'),
            gradient: /gradient$/i,
            angle: /\d+(deg|g?rad|turn)/i,
            url: /^url/i
          }
        }

        const colorSafe = context.util.guardHexColors(value)
        const funcSafe = context.util.guardFunctions(colorSafe.value)
        const parts = funcSafe.value.split(',')
        const lprop = prop.toLowerCase()
        if (lprop !== 'background-image') {
          for (let x = 0; x < parts.length; x++) {
            parts[x] = this.flip(parts[x], context, lprop.endsWith('-x'))
          }
        }

        funcSafe.value = parts.join(',')
        colorSafe.value = context.util.unguardFunctions(funcSafe, this.update.bind(this, context))
        return {
          prop,
          value: context.util.unguardHexColors(colorSafe)
        }
      }
    },
    {
      name: 'keyword',
      expr: /float|clear|text-align|justify-(content|items|self)/i,
      action (prop, value, context) {
        return { prop, value: context.util.swapLeftRight(value) }
      }
    },
    {
      name: 'cursor',
      expr: /cursor/i,
      cache: null,
      update (context, value, name) {
        return (context.config.processUrls === true || context.config.processUrls.decl === true) && name.match(this.cache.url)
          ? context.util.applyStringMap(value, true)
          : value
      },
      flip (value) {
        return value.replace(this.cache.replace, (s, m) => {
          return s.replace(m, m.replace(this.cache.e, '*')
            .replace(this.cache.w, 'e')
            .replace(this.cache.star, 'w'))
        })
      },
      action (prop, value, context) {
        if (this.cache === null) {
          this.cache = {
            replace: /\b(ne|nw|se|sw|nesw|nwse)-resize/ig,
            url: /^url/i,
            e: /e/i,
            w: /w/i,
            star: /\*/i
          }
        }

        const state = context.util.guardFunctions(value)
        state.value = state.value.split(',')
          .map((part) => this.flip(part))
          .join(',')

        return {
          prop,
          value: context.util.unguardFunctions(state, this.update.bind(this, context))
        }
      }
    }
  ]
}
