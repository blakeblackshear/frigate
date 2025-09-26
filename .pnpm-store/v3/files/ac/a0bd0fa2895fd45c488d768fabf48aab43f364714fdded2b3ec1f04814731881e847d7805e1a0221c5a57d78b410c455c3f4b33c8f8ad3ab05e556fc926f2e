import { factorySpace } from 'micromark-factory-space'
import { markdownLineEnding } from 'micromark-util-character'
import { codes } from 'micromark-util-symbol/codes.js'
import { types } from 'micromark-util-symbol/types.js'

export default function remarkComment(options) {
  const data = this.data()
  const add = (field, value) =>
    (data[field] ? data[field] : (data[field] = [])).push(value)
  add('micromarkExtensions', comment)
  add('htmlExtensions', commentHtml)
  add('fromMarkdownExtensions', commentFromMarkdown(options))
  add('toMarkdownExtensions', commentToMarkdown)
}

export const comment = {
  flow: { [60]: { tokenize, concrete: true } },
  text: { [60]: { tokenize } },
}

export const commentHtml = {
  enter: {
    comment() {
      this.buffer()
    },
  },
  exit: {
    comment() {
      this.resume()
      this.setData('slurpOneLineEnding', true)
    },
  },
}

export function commentFromMarkdown(options) {
  return {
    canContainEols: ['comment'],
    enter: {
      comment(token) {
        this.buffer()
      },
    },
    exit: {
      comment(token) {
        const text = this.resume()
        if (options?.ast) {
          this.enter(
            {
              type: 'comment',
              value: '',
              commentValue: text.slice(0, -2),
            },
            token
          )
          this.exit(token)
        }
      },
    },
  }
}

export const commentToMarkdown = {
  handlers: {
    comment(node) {
      return `<!--${node.commentValue.replace(/(?<=--)>/g, '\\>')}-->`
    },
  },
}

function tokenize(effects, ok, nok) {
  const self = this
  return start

  function start(code) {
    effects.enter('comment')
    effects.consume(code)
    return open
  }

  function open(code) {
    if (code === codes.exclamationMark) {
      effects.consume(code)
      return declarationOpen
    }

    return nok(code)
  }

  function declarationOpen(code) {
    if (code === codes.dash) {
      effects.consume(code)
      return commentOpen
    }

    return nok(code)
  }

  function commentOpen(code) {
    if (code === codes.dash) {
      effects.consume(code)
      return commentStart
    }

    return nok(code)
  }

  function commentStart(code) {
    if (code === codes.greaterThan) {
      return nok(code)
    }

    if (markdownLineEnding(code)) {
      return atLineEnding(code);
    }

    effects.enter(types.data)

    if (code === codes.dash) {
      effects.consume(code)
      return commentStartDash
    }

    return comment(code)
  }

  function commentStartDash(code) {
    if (code === codes.greaterThan) {
      return nok(code)
    }

    return comment(code)
  }

  function comment(code) {
    if (code === codes.eof) {
      return nok(code)
    }

    if (code === codes.dash) {
      effects.consume(code)
      return commentClose
    }

    if (markdownLineEnding(code)) {
      effects.exit(types.data)
      return atLineEnding(code)
    }

    effects.consume(code)
    return comment
  }

  function atLineEnding(code) {
    effects.enter(types.lineEnding)
    effects.consume(code)
    effects.exit(types.lineEnding)
    return factorySpace(effects, afterPrefix, types.linePrefix)
  }

  function afterPrefix(code) {
    if (markdownLineEnding(code)) {
      return atLineEnding(code)
    }

    effects.enter(types.data)
    return comment(code)
  }

  function commentClose(code) {
    if (code === codes.dash) {
      effects.consume(code)
      return end
    }

    return comment(code)
  }

  function end(code) {
    if (code === codes.greaterThan) {
      effects.exit(types.data)
      effects.enter('commentEnd') // See https://github.com/leebyron/remark-comment/pull/3#discussion_r1239494357
      effects.consume(code)
      effects.exit('commentEnd')
      effects.exit('comment')
      return ok(code)
    }

    if (code === codes.dash) {
      effects.consume(code)
      return end
    }

    return comment(code)
  }
}
