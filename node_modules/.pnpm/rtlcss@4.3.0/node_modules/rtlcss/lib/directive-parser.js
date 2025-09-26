'use strict'

module.exports = (comment) => {
  const match = comment.text.match(/^\s*!?\s*rtl:/)
  if (!match) return

  let value = comment.text.slice(match[0].length)
  let pos = value.indexOf(':')
  const meta = {
    source: comment,
    name: '',
    param: '',
    begin: true,
    end: true,
    blacklist: false,
    preserve: false
  }

  if (pos !== -1) {
    meta.name = value.slice(0, pos)
    // begin/end are always true, unless one of them actually exists.
    meta.begin = meta.name !== 'end'
    meta.end = meta.name !== 'begin'

    if (meta.name === 'begin' || meta.name === 'end') {
      value = value.slice(meta.name.length + 1)
      pos = value.indexOf(':')

      if (pos !== -1) {
        meta.name = value.slice(0, pos)
        meta.param = value.slice(pos + 1)
      } else {
        meta.name = value
      }
    } else {
      meta.param = value.slice(pos + 1)
    }
  } else {
    meta.name = value
  }

  return meta
}
