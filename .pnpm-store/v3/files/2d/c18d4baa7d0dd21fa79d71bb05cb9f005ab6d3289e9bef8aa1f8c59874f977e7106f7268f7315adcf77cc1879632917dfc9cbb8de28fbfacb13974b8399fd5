/**
 * @import {Directives, LeafDirective, TextDirective, ToMarkdownOptions} from 'mdast-util-directive'
 * @import {
 *   CompileContext,
 *   Extension as FromMarkdownExtension,
 *   Handle as FromMarkdownHandle,
 *   Token
 * } from 'mdast-util-from-markdown'
 * @import {
 *   ConstructName,
 *   Handle as ToMarkdownHandle,
 *   Options as ToMarkdownExtension,
 *   State
 * } from 'mdast-util-to-markdown'
 * @import {Nodes, Paragraph} from 'mdast'
 */

import {ccount} from 'ccount'
import {ok as assert} from 'devlop'
import {parseEntities} from 'parse-entities'
import {stringifyEntitiesLight} from 'stringify-entities'
import {visitParents} from 'unist-util-visit-parents'

const own = {}.hasOwnProperty

/** @type {Readonly<ToMarkdownOptions>} */
const emptyOptions = {}

const shortcut = /^[^\t\n\r "#'.<=>`}]+$/
const unquoted = /^[^\t\n\r "'<=>`}]+$/

/**
 * Create an extension for `mdast-util-from-markdown` to enable directives in
 * markdown.
 *
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown` to enable directives.
 */
export function directiveFromMarkdown() {
  return {
    canContainEols: ['textDirective'],
    enter: {
      directiveContainer: enterContainer,
      directiveContainerAttributes: enterAttributes,
      directiveContainerLabel: enterContainerLabel,

      directiveLeaf: enterLeaf,
      directiveLeafAttributes: enterAttributes,

      directiveText: enterText,
      directiveTextAttributes: enterAttributes
    },
    exit: {
      directiveContainer: exit,
      directiveContainerAttributeClassValue: exitAttributeClassValue,
      directiveContainerAttributeIdValue: exitAttributeIdValue,
      directiveContainerAttributeName: exitAttributeName,
      directiveContainerAttributeValue: exitAttributeValue,
      directiveContainerAttributes: exitAttributes,
      directiveContainerLabel: exitContainerLabel,
      directiveContainerName: exitName,

      directiveLeaf: exit,
      directiveLeafAttributeClassValue: exitAttributeClassValue,
      directiveLeafAttributeIdValue: exitAttributeIdValue,
      directiveLeafAttributeName: exitAttributeName,
      directiveLeafAttributeValue: exitAttributeValue,
      directiveLeafAttributes: exitAttributes,
      directiveLeafName: exitName,

      directiveText: exit,
      directiveTextAttributeClassValue: exitAttributeClassValue,
      directiveTextAttributeIdValue: exitAttributeIdValue,
      directiveTextAttributeName: exitAttributeName,
      directiveTextAttributeValue: exitAttributeValue,
      directiveTextAttributes: exitAttributes,
      directiveTextName: exitName
    }
  }
}

/**
 * Create an extension for `mdast-util-to-markdown` to enable directives in
 * markdown.
 *
 * @param {Readonly<ToMarkdownOptions> | null | undefined} [options]
 *   Configuration (optional).
 * @returns {ToMarkdownExtension}
 *   Extension for `mdast-util-to-markdown` to enable directives.
 */
export function directiveToMarkdown(options) {
  const settings = options || emptyOptions

  if (
    settings.quote !== '"' &&
    settings.quote !== "'" &&
    settings.quote !== null &&
    settings.quote !== undefined
  ) {
    throw new Error(
      'Invalid quote `' + settings.quote + '`, expected `\'` or `"`'
    )
  }

  handleDirective.peek = peekDirective

  return {
    handlers: {
      containerDirective: handleDirective,
      leafDirective: handleDirective,
      textDirective: handleDirective
    },
    unsafe: [
      {
        character: '\r',
        inConstruct: ['leafDirectiveLabel', 'containerDirectiveLabel']
      },
      {
        character: '\n',
        inConstruct: ['leafDirectiveLabel', 'containerDirectiveLabel']
      },
      {
        before: '[^:]',
        character: ':',
        after: '[A-Za-z]',
        inConstruct: ['phrasing']
      },
      {atBreak: true, character: ':', after: ':'}
    ]
  }

  /**
   * @type {ToMarkdownHandle}
   * @param {Directives} node
   */
  function handleDirective(node, _, state, info) {
    const tracker = state.createTracker(info)
    const sequence = fence(node)
    const exit = state.enter(node.type)
    let value = tracker.move(sequence + (node.name || ''))
    /** @type {LeafDirective | Paragraph | TextDirective | undefined} */
    let label

    if (node.type === 'containerDirective') {
      const head = (node.children || [])[0]
      label = inlineDirectiveLabel(head) ? head : undefined
    } else {
      label = node
    }

    if (label && label.children && label.children.length > 0) {
      const exit = state.enter('label')
      /** @type {ConstructName} */
      const labelType = `${node.type}Label`
      const subexit = state.enter(labelType)
      value += tracker.move('[')
      value += tracker.move(
        state.containerPhrasing(label, {
          ...tracker.current(),
          before: value,
          after: ']'
        })
      )
      value += tracker.move(']')
      subexit()
      exit()
    }

    value += tracker.move(attributes(node, state))

    if (node.type === 'containerDirective') {
      const head = (node.children || [])[0]
      let shallow = node

      if (inlineDirectiveLabel(head)) {
        shallow = Object.assign({}, node, {children: node.children.slice(1)})
      }

      if (shallow && shallow.children && shallow.children.length > 0) {
        value += tracker.move('\n')
        value += tracker.move(state.containerFlow(shallow, tracker.current()))
      }

      value += tracker.move('\n' + sequence)
    }

    exit()
    return value
  }

  /**
   * @param {Directives} node
   * @param {State} state
   * @returns {string}
   */
  function attributes(node, state) {
    const attributes = node.attributes || {}
    /** @type {Array<string>} */
    const values = []
    /** @type {string | undefined} */
    let classesFull
    /** @type {string | undefined} */
    let classes
    /** @type {string | undefined} */
    let id
    /** @type {string} */
    let key

    for (key in attributes) {
      if (
        own.call(attributes, key) &&
        attributes[key] !== undefined &&
        attributes[key] !== null
      ) {
        const value = String(attributes[key])

        // To do: next major:
        // Do not reorder `id` and `class` attributes when they do not turn into
        // shortcuts.
        // Additionally, join shortcuts: `#a .b.c d="e"` -> `#a.b.c d="e"`
        if (key === 'id') {
          id =
            settings.preferShortcut !== false && shortcut.test(value)
              ? '#' + value
              : quoted('id', value, node, state)
        } else if (key === 'class') {
          const list = value.split(/[\t\n\r ]+/g)
          /** @type {Array<string>} */
          const classesFullList = []
          /** @type {Array<string>} */
          const classesList = []
          let index = -1

          while (++index < list.length) {
            ;(settings.preferShortcut !== false && shortcut.test(list[index])
              ? classesList
              : classesFullList
            ).push(list[index])
          }

          classesFull =
            classesFullList.length > 0
              ? quoted('class', classesFullList.join(' '), node, state)
              : ''
          classes = classesList.length > 0 ? '.' + classesList.join('.') : ''
        } else {
          values.push(quoted(key, value, node, state))
        }
      }
    }

    if (classesFull) {
      values.unshift(classesFull)
    }

    if (classes) {
      values.unshift(classes)
    }

    if (id) {
      values.unshift(id)
    }

    return values.length > 0 ? '{' + values.join(' ') + '}' : ''
  }

  /**
   * @param {string} key
   * @param {string} value
   * @param {Directives} node
   * @param {State} state
   * @returns {string}
   */
  function quoted(key, value, node, state) {
    if (settings.collapseEmptyAttributes !== false && !value) return key

    if (settings.preferUnquoted && unquoted.test(value)) {
      return key + '=' + value
    }

    // If the alternative is less common than `quote`, switch.
    const preferred = settings.quote || state.options.quote || '"'
    const alternative = preferred === '"' ? "'" : '"'
    // If the alternative is less common than `quote`, switch.
    const appliedQuote =
      settings.quoteSmart &&
      ccount(value, preferred) > ccount(value, alternative)
        ? alternative
        : preferred
    const subset =
      node.type === 'textDirective'
        ? [appliedQuote]
        : [appliedQuote, '\n', '\r']

    return (
      key +
      '=' +
      appliedQuote +
      stringifyEntitiesLight(value, {subset}) +
      appliedQuote
    )
  }
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterContainer(token) {
  enter.call(this, 'containerDirective', token)
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterLeaf(token) {
  enter.call(this, 'leafDirective', token)
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterText(token) {
  enter.call(this, 'textDirective', token)
}

/**
 * @this {CompileContext}
 * @param {Directives['type']} type
 * @param {Token} token
 */
function enter(type, token) {
  this.enter({type, name: '', attributes: {}, children: []}, token)
}

/**
 * @this {CompileContext}
 * @param {Token} token
 */
function exitName(token) {
  const node = this.stack[this.stack.length - 1]
  assert(
    node.type === 'containerDirective' ||
      node.type === 'leafDirective' ||
      node.type === 'textDirective'
  )
  node.name = this.sliceSerialize(token)
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterContainerLabel(token) {
  this.enter(
    {type: 'paragraph', data: {directiveLabel: true}, children: []},
    token
  )
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitContainerLabel(token) {
  this.exit(token)
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function enterAttributes() {
  this.data.directiveAttributes = []
  this.buffer() // Capture EOLs
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitAttributeIdValue(token) {
  const list = this.data.directiveAttributes
  assert(list, 'expected `directiveAttributes`')
  list.push([
    'id',
    parseEntities(this.sliceSerialize(token), {attribute: true})
  ])
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitAttributeClassValue(token) {
  const list = this.data.directiveAttributes
  assert(list, 'expected `directiveAttributes`')
  list.push([
    'class',
    parseEntities(this.sliceSerialize(token), {attribute: true})
  ])
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitAttributeValue(token) {
  const list = this.data.directiveAttributes
  assert(list, 'expected `directiveAttributes`')
  list[list.length - 1][1] = parseEntities(this.sliceSerialize(token), {
    attribute: true
  })
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitAttributeName(token) {
  const list = this.data.directiveAttributes
  assert(list, 'expected `directiveAttributes`')

  // Attribute names in CommonMark are significantly limited, so character
  // references can’t exist.
  list.push([this.sliceSerialize(token), ''])
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exitAttributes() {
  const list = this.data.directiveAttributes
  assert(list, 'expected `directiveAttributes`')
  /** @type {Record<string, string>} */
  const cleaned = {}
  let index = -1

  while (++index < list.length) {
    const attribute = list[index]

    if (attribute[0] === 'class' && cleaned.class) {
      cleaned.class += ' ' + attribute[1]
    } else {
      cleaned[attribute[0]] = attribute[1]
    }
  }

  this.data.directiveAttributes = undefined
  this.resume() // Drop EOLs
  const node = this.stack[this.stack.length - 1]
  assert(
    node.type === 'containerDirective' ||
      node.type === 'leafDirective' ||
      node.type === 'textDirective'
  )
  node.attributes = cleaned
}

/**
 * @this {CompileContext}
 * @type {FromMarkdownHandle}
 */
function exit(token) {
  this.exit(token)
}

/** @type {ToMarkdownHandle} */
function peekDirective() {
  return ':'
}

/**
 * @param {Nodes} node
 * @returns {node is Paragraph & {data: {directiveLabel: true}}}
 */
function inlineDirectiveLabel(node) {
  return Boolean(
    node && node.type === 'paragraph' && node.data && node.data.directiveLabel
  )
}

/**
 * @param {Directives} node
 * @returns {string}
 */
function fence(node) {
  let size = 0

  if (node.type === 'containerDirective') {
    visitParents(node, function (node, parents) {
      if (node.type === 'containerDirective') {
        let index = parents.length
        let nesting = 0

        while (index--) {
          if (parents[index].type === 'containerDirective') {
            nesting++
          }
        }

        if (nesting > size) size = nesting
      }
    })
    size += 3
  } else if (node.type === 'leafDirective') {
    size = 2
  } else {
    size = 1
  }

  return ':'.repeat(size)
}
