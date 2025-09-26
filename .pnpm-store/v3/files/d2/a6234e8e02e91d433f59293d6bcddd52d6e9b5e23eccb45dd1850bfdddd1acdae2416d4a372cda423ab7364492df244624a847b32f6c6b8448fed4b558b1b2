/**
 * @import {Options} from 'hast-util-raw'
 * @import {Comment, Doctype, Element, Nodes, RootContent, Root, Text} from 'hast'
 * @import {Raw} from 'mdast-util-to-hast'
 * @import {DefaultTreeAdapterMap, ParserOptions} from 'parse5'
 * @import {Point} from 'unist'
 */

/**
 * @typedef State
 *   Info passed around about the current state.
 * @property {(node: Nodes) => undefined} handle
 *   Add a hast node to the parser.
 * @property {Options} options
 *   User configuration.
 * @property {Parser<DefaultTreeAdapterMap>} parser
 *   Current parser.
 * @property {boolean} stitches
 *   Whether there are stitches.
 */

/**
 * @typedef Stitch
 *   Custom comment-like value we pass through parse5, which contains a
 *   replacement node that we’ll swap back in afterwards.
 * @property {'comment'} type
 *   Node type.
 * @property {{stitch: Nodes}} value
 *   Replacement value.
 */

import structuredClone from '@ungap/structured-clone'
import {fromParse5} from 'hast-util-from-parse5'
import {toParse5} from 'hast-util-to-parse5'
import {htmlVoidElements} from 'html-void-elements'
import {Parser, Token, TokenizerMode, html} from 'parse5'
import {pointEnd, pointStart} from 'unist-util-position'
import {visit} from 'unist-util-visit'
import {webNamespaces} from 'web-namespaces'
import {zwitch} from 'zwitch'

const gfmTagfilterExpression =
  /<(\/?)(iframe|noembed|noframes|plaintext|script|style|textarea|title|xmp)(?=[\t\n\f\r />])/gi

// Node types associated with MDX.
// <https://github.com/mdx-js/mdx/blob/8a56312/packages/mdx/lib/node-types.js>
const knownMdxNames = new Set([
  'mdxFlowExpression',
  'mdxJsxFlowElement',
  'mdxJsxTextElement',
  'mdxTextExpression',
  'mdxjsEsm'
])

/** @type {ParserOptions<DefaultTreeAdapterMap>} */
const parseOptions = {sourceCodeLocationInfo: true, scriptingEnabled: false}

/**
 * Pass a hast tree through an HTML parser, which will fix nesting, and turn
 * raw nodes into actual nodes.
 *
 * @param {Nodes} tree
 *   Original hast tree to transform.
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Nodes}
 *   Parsed again tree.
 */
export function raw(tree, options) {
  const document = documentMode(tree)
  /** @type {(node: Nodes, state: State) => undefined} */
  const one = zwitch('type', {
    handlers: {root, element, text, comment, doctype, raw: handleRaw},
    unknown
  })

  /** @type {State} */
  const state = {
    parser: document
      ? new Parser(parseOptions)
      : Parser.getFragmentParser(undefined, parseOptions),
    handle(node) {
      one(node, state)
    },
    stitches: false,
    options: options || {}
  }

  one(tree, state)
  resetTokenizer(state, pointStart())

  const p5 = document ? state.parser.document : state.parser.getFragment()
  const result = fromParse5(p5, {
    // To do: support `space`?
    file: state.options.file
  })

  if (state.stitches) {
    visit(result, 'comment', function (node, index, parent) {
      const stitch = /** @type {Stitch} */ (/** @type {unknown} */ (node))
      if (stitch.value.stitch && parent && index !== undefined) {
        /** @type {Array<RootContent>} */
        const siblings = parent.children
        // @ts-expect-error: assume the stitch is allowed.
        siblings[index] = stitch.value.stitch
        return index
      }
    })
  }

  // Unpack if possible and when not given a `root`.
  if (
    result.type === 'root' &&
    result.children.length === 1 &&
    result.children[0].type === tree.type
  ) {
    return result.children[0]
  }

  return result
}

/**
 * Transform all nodes
 *
 * @param {Array<RootContent>} nodes
 *   hast content.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {undefined}
 *   Nothing.
 */
function all(nodes, state) {
  let index = -1

  /* istanbul ignore else - invalid nodes, see rehypejs/rehype-raw#7. */
  if (nodes) {
    while (++index < nodes.length) {
      state.handle(nodes[index])
    }
  }
}

/**
 * Transform a root.
 *
 * @param {Root} node
 *   hast root node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {undefined}
 *   Nothing.
 */
function root(node, state) {
  all(node.children, state)
}

/**
 * Transform an element.
 *
 * @param {Element} node
 *   hast element node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {undefined}
 *   Nothing.
 */
function element(node, state) {
  startTag(node, state)

  all(node.children, state)

  endTag(node, state)
}

/**
 * Transform a text.
 *
 * @param {Text} node
 *   hast text node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {undefined}
 *   Nothing.
 */
function text(node, state) {
  // Allow `DATA` through `PLAINTEXT`,
  // but when hanging in a tag for example,
  // switch back to `DATA`.
  // Note: `State` is not exposed by `parse5`, so these numbers are fragile.
  // See: <https://github.com/inikulin/parse5/blob/46cba43/packages/parse5/lib/tokenizer/index.ts#L58>
  if (state.parser.tokenizer.state > 4) {
    state.parser.tokenizer.state = 0
  }

  /** @type {Token.CharacterToken} */
  const token = {
    type: Token.TokenType.CHARACTER,
    chars: node.value,
    location: createParse5Location(node)
  }

  resetTokenizer(state, pointStart(node))
  // @ts-expect-error: private.
  state.parser.currentToken = token
  // @ts-expect-error: private.
  state.parser._processToken(state.parser.currentToken)
}

/**
 * Transform a doctype.
 *
 * @param {Doctype} node
 *   hast doctype node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {undefined}
 *   Nothing.
 */
function doctype(node, state) {
  /** @type {Token.DoctypeToken} */
  const token = {
    type: Token.TokenType.DOCTYPE,
    name: 'html',
    forceQuirks: false,
    publicId: '',
    systemId: '',
    location: createParse5Location(node)
  }

  resetTokenizer(state, pointStart(node))
  // @ts-expect-error: private.
  state.parser.currentToken = token
  // @ts-expect-error: private.
  state.parser._processToken(state.parser.currentToken)
}

/**
 * Transform a stitch.
 *
 * @param {Nodes} node
 *   unknown node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {undefined}
 *   Nothing.
 */
function stitch(node, state) {
  // Mark that there are stitches, so we need to walk the tree and revert them.
  state.stitches = true

  /** @type {Nodes} */
  const clone = cloneWithoutChildren(node)

  // Recurse, because to somewhat handle `[<x>]</x>` (where `[]` denotes the
  // passed through node).
  if ('children' in node && 'children' in clone) {
    // Root in root out.
    const fakeRoot = /** @type {Root} */ (
      raw({type: 'root', children: node.children}, state.options)
    )
    clone.children = fakeRoot.children
  }

  // Hack: `value` is supposed to be a string, but as none of the tools
  // (`parse5` or `hast-util-from-parse5`) looks at it, we can pass nodes
  // through.
  comment({type: 'comment', value: {stitch: clone}}, state)
}

/**
 * Transform a comment (or stitch).
 *
 * @param {Comment | Stitch} node
 *   hast comment node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {undefined}
 *   Nothing.
 */
function comment(node, state) {
  /** @type {string} */
  // @ts-expect-error: we pass stitches through.
  const data = node.value

  /** @type {Token.CommentToken} */
  const token = {
    type: Token.TokenType.COMMENT,
    data,
    location: createParse5Location(node)
  }
  resetTokenizer(state, pointStart(node))
  // @ts-expect-error: private.
  state.parser.currentToken = token
  // @ts-expect-error: private.
  state.parser._processToken(state.parser.currentToken)
}

/**
 * Transform a raw node.
 *
 * @param {Raw} node
 *   hast raw node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {undefined}
 *   Nothing.
 */
function handleRaw(node, state) {
  // Reset preprocessor:
  // See: <https://github.com/inikulin/parse5/blob/6f7ca60/packages/parse5/lib/tokenizer/preprocessor.ts#L18-L31>.
  state.parser.tokenizer.preprocessor.html = ''
  state.parser.tokenizer.preprocessor.pos = -1
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.preprocessor.lastGapPos = -2
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.preprocessor.gapStack = []
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.preprocessor.skipNextNewLine = false
  state.parser.tokenizer.preprocessor.lastChunkWritten = false
  state.parser.tokenizer.preprocessor.endOfChunkHit = false
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.preprocessor.isEol = false

  // Now pass `node.value`.
  setPoint(state, pointStart(node))

  state.parser.tokenizer.write(
    state.options.tagfilter
      ? node.value.replace(gfmTagfilterExpression, '&lt;$1$2')
      : node.value,
    false
  )
  // @ts-expect-error: private.
  state.parser.tokenizer._runParsingLoop()

  // Character references hang, so if we ended there, we need to flush
  // those too.
  // We reset the preprocessor as if the document ends here.
  // Then one single call to the relevant state does the trick, parse5
  // consumes the whole token.

  // Note: `State` is not exposed by `parse5`, so these numbers are fragile.
  // See: <https://github.com/inikulin/parse5/blob/46cba43/packages/parse5/lib/tokenizer/index.ts#L58>
  // Note: a change to `parse5`, which breaks this, was merged but not released.
  // Investigate when it is.
  // To do: remove next major.
  /* c8 ignore next 12 -- removed in <https://github.com/inikulin/parse5/pull/897> */
  if (
    state.parser.tokenizer.state === 72 /* NAMED_CHARACTER_REFERENCE */ ||
    // @ts-expect-error: removed.
    state.parser.tokenizer.state === 78 /* NUMERIC_CHARACTER_REFERENCE_END */
  ) {
    state.parser.tokenizer.preprocessor.lastChunkWritten = true
    /** @type {number} */
    // @ts-expect-error: private.
    const cp = state.parser.tokenizer._consume()
    // @ts-expect-error: private.
    state.parser.tokenizer._callState(cp)
  }
}

/**
 * Crash on an unknown node.
 *
 * @param {unknown} node_
 *   unknown node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {undefined}
 *   Never.
 */
function unknown(node_, state) {
  const node = /** @type {Nodes} */ (node_)

  if (
    state.options.passThrough &&
    state.options.passThrough.includes(node.type)
  ) {
    stitch(node, state)
  } else {
    let extra = ''

    if (knownMdxNames.has(node.type)) {
      extra =
        ". It looks like you are using MDX nodes with `hast-util-raw` (or `rehype-raw`). If you use this because you are using remark or rehype plugins that inject `'html'` nodes, then please raise an issue with that plugin, as its a bad and slow idea. If you use this because you are using markdown syntax, then you have to configure this utility (or plugin) to pass through these nodes (see `passThrough` in docs), but you can also migrate to use the MDX syntax"
    }

    throw new Error('Cannot compile `' + node.type + '` node' + extra)
  }
}

/**
 * Reset the tokenizer of a parser.
 *
 * @param {State} state
 *   Info passed around about the current state.
 * @param {Point | undefined} point
 *   Point.
 * @returns {undefined}
 *   Nothing.
 */
function resetTokenizer(state, point) {
  setPoint(state, point)

  // Process final characters if they’re still there after hibernating.
  /** @type {Token.CharacterToken} */
  // @ts-expect-error: private.
  const token = state.parser.tokenizer.currentCharacterToken

  if (token && token.location) {
    token.location.endLine = state.parser.tokenizer.preprocessor.line
    token.location.endCol = state.parser.tokenizer.preprocessor.col + 1
    token.location.endOffset = state.parser.tokenizer.preprocessor.offset + 1
    // @ts-expect-error: private.
    state.parser.currentToken = token
    // @ts-expect-error: private.
    state.parser._processToken(state.parser.currentToken)
  }

  // Reset tokenizer:
  // See: <https://github.com/inikulin/parse5/blob/6f7ca60/packages/parse5/lib/tokenizer/index.ts#L187-L223>.
  // Especially putting it back in the `data` state is useful: some elements,
  // like textareas and iframes, change the state.
  // See GH-7.
  // But also if broken HTML is in `raw`, and then a correct element is given.
  // See GH-11.
  // @ts-expect-error: private.
  state.parser.tokenizer.paused = false
  // @ts-expect-error: private.
  state.parser.tokenizer.inLoop = false

  // Note: don’t reset `state`, `inForeignNode`, or `lastStartTagName`, we
  // manually update those when needed.
  state.parser.tokenizer.active = false
  // @ts-expect-error: private.
  state.parser.tokenizer.returnState = TokenizerMode.DATA
  // @ts-expect-error: private.
  state.parser.tokenizer.charRefCode = -1
  // @ts-expect-error: private.
  state.parser.tokenizer.consumedAfterSnapshot = -1
  // @ts-expect-error: private.
  state.parser.tokenizer.currentLocation = null
  // @ts-expect-error: private.
  state.parser.tokenizer.currentCharacterToken = null
  // @ts-expect-error: private.
  state.parser.tokenizer.currentToken = null
  // @ts-expect-error: private.
  state.parser.tokenizer.currentAttr = {name: '', value: ''}
}

/**
 * Set current location.
 *
 * @param {State} state
 *   Info passed around about the current state.
 * @param {Point | undefined} point
 *   Point.
 * @returns {undefined}
 *   Nothing.
 */
function setPoint(state, point) {
  if (point && point.offset !== undefined) {
    /** @type {Token.Location} */
    const location = {
      startLine: point.line,
      startCol: point.column,
      startOffset: point.offset,
      endLine: -1,
      endCol: -1,
      endOffset: -1
    }

    // @ts-expect-error: private.
    // type-coverage:ignore-next-line
    state.parser.tokenizer.preprocessor.lineStartPos = -point.column + 1 // Looks weird, but ensures we get correct positional info.
    state.parser.tokenizer.preprocessor.droppedBufferSize = point.offset
    state.parser.tokenizer.preprocessor.line = point.line
    // @ts-expect-error: private.
    state.parser.tokenizer.currentLocation = location
  }
}

/**
 * Emit a start tag.
 *
 * @param {Element} node
 *   Element.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {undefined}
 *   Nothing.
 */
function startTag(node, state) {
  const tagName = node.tagName.toLowerCase()

  // Ignore tags if we’re in plain text.
  if (state.parser.tokenizer.state === TokenizerMode.PLAINTEXT) return

  resetTokenizer(state, pointStart(node))

  const current = state.parser.openElements.current
  let ns = 'namespaceURI' in current ? current.namespaceURI : webNamespaces.html

  if (ns === webNamespaces.html && tagName === 'svg') {
    ns = webNamespaces.svg
  }

  const result = toParse5(
    // Shallow clone to not delve into `children`: we only need the attributes.
    {...node, children: []},
    {space: ns === webNamespaces.svg ? 'svg' : 'html'}
  )

  /** @type {Token.TagToken} */
  const tag = {
    type: Token.TokenType.START_TAG,
    tagName,
    tagID: html.getTagID(tagName),
    // We always send start and end tags.
    selfClosing: false,
    ackSelfClosing: false,
    // Always element.
    /* c8 ignore next */
    attrs: 'attrs' in result ? result.attrs : [],
    location: createParse5Location(node)
  }

  // The HTML parsing algorithm works by doing half of the state management in
  // the tokenizer and half in the parser.
  // We can’t use the tokenizer here, as we don’t have strings.
  // So we act *as if* the tokenizer emits tokens:

  // @ts-expect-error: private.
  state.parser.currentToken = tag
  // @ts-expect-error: private.
  state.parser._processToken(state.parser.currentToken)

  // …but then we still need a bunch of work that the tokenizer would normally
  // do, such as:

  // Set a tag name, similar to how the tokenizer would do it.
  state.parser.tokenizer.lastStartTagName = tagName

  // `inForeignNode` is correctly set by the parser.
}

/**
 * Emit an end tag.
 *
 * @param {Element} node
 *   Element.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {undefined}
 *   Nothing.
 */
function endTag(node, state) {
  const tagName = node.tagName.toLowerCase()
  // Do not emit closing tags for HTML void elements.
  if (
    !state.parser.tokenizer.inForeignNode &&
    htmlVoidElements.includes(tagName)
  ) {
    return
  }

  // Ignore tags if we’re in plain text.
  if (state.parser.tokenizer.state === TokenizerMode.PLAINTEXT) return

  resetTokenizer(state, pointEnd(node))

  /** @type {Token.TagToken} */
  const tag = {
    type: Token.TokenType.END_TAG,
    tagName,
    tagID: html.getTagID(tagName),
    selfClosing: false,
    ackSelfClosing: false,
    attrs: [],
    location: createParse5Location(node)
  }

  // The HTML parsing algorithm works by doing half of the state management in
  // the tokenizer and half in the parser.
  // We can’t use the tokenizer here, as we don’t have strings.
  // So we act *as if* the tokenizer emits tokens:

  // @ts-expect-error: private.
  state.parser.currentToken = tag
  // @ts-expect-error: private.
  state.parser._processToken(state.parser.currentToken)

  // …but then we still need a bunch of work that the tokenizer would normally
  // do, such as:

  // Switch back to the data state after alternative states that don’t accept
  // tags:
  if (
    // Current element is closed.
    tagName === state.parser.tokenizer.lastStartTagName &&
    // `<textarea>` and `<title>`
    (state.parser.tokenizer.state === TokenizerMode.RCDATA ||
      // `<iframe>`, `<noembed>`, `<noframes>`, `<style>`, `<xmp>`
      state.parser.tokenizer.state === TokenizerMode.RAWTEXT ||
      // `<script>`
      state.parser.tokenizer.state === TokenizerMode.SCRIPT_DATA)
    // Note: `<plaintext>` not needed, as it’s the last element.
  ) {
    state.parser.tokenizer.state = TokenizerMode.DATA
  }
}

/**
 * Check if `node` represents a whole document or a fragment.
 *
 * @param {Nodes} node
 *   hast node.
 * @returns {boolean}
 *   Whether this represents a whole document or a fragment.
 */
function documentMode(node) {
  const head = node.type === 'root' ? node.children[0] : node
  return Boolean(
    head &&
      (head.type === 'doctype' ||
        (head.type === 'element' && head.tagName.toLowerCase() === 'html'))
  )
}

/**
 * Get a `parse5` location from a node.
 *
 * @param {Nodes | Stitch} node
 *   hast node.
 * @returns {Token.Location}
 *   `parse5` location.
 */
function createParse5Location(node) {
  const start = pointStart(node) || {
    line: undefined,
    column: undefined,
    offset: undefined
  }
  const end = pointEnd(node) || {
    line: undefined,
    column: undefined,
    offset: undefined
  }

  /** @type {Record<keyof Token.Location, number | undefined>} */
  const location = {
    startLine: start.line,
    startCol: start.column,
    startOffset: start.offset,
    endLine: end.line,
    endCol: end.column,
    endOffset: end.offset
  }

  // @ts-expect-error: unist point values can be `undefined` in hast, which
  // `parse5` types don’t want.
  return location
}

/**
 * @template {Nodes} NodeType
 *   Node type.
 * @param {NodeType} node
 *   Node to clone.
 * @returns {NodeType}
 *   Cloned node, without children.
 */
function cloneWithoutChildren(node) {
  return 'children' in node
    ? structuredClone({...node, children: []})
    : structuredClone(node)
}
