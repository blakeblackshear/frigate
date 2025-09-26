'use strict'

const directiveParser = require('./directive-parser.js')

module.exports = {
  stack: [],
  pop (current) {
    const index = this.stack.indexOf(current)
    if (index !== -1) {
      this.stack.splice(index, 1)
    }

    if (!current.preserve) {
      current.source.remove()
    }
  },
  parse (node, lazyResult, callback) {
    const metadata = directiveParser(node)
    if (!metadata) return

    let current
    if (!metadata.begin && metadata.end) {
      this.walk((item) => {
        if (metadata.name === item.metadata.name) {
          this.pop(item)
          current = {
            metadata,
            directive: item.directive,
            source: node,
            preserve: item.preserve
          }
          return false
        }
      })
    } else {
      current = {
        metadata,
        directive: null,
        source: node,
        preserve: null
      }
    }

    if (current === undefined) {
      lazyResult.warn(`found end "${metadata.name}" without a matching begin.`, { node })
    } else if (callback(current)) {
      this.stack.push(current)
    } else if (!current.preserve) {
      current.source.remove()
    }
  },
  walk (callback) {
    let len = this.stack.length
    while (--len > -1) {
      if (!callback(this.stack[len])) {
        break
      }
    }
  }
}
