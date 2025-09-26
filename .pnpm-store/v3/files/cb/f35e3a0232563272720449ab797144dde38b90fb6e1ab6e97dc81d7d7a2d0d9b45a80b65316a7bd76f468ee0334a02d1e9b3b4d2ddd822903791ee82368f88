import type {Nodes, Parent, PhrasingContent, Root} from 'mdast'
import type {ParseOptions, Token} from 'micromark-util-types'

/**
 * Compiler context.
 */
export interface CompileContext {
  /**
   * Configuration.
   */
  config: Config
  /**
   * Info passed around;
   * key/value store.
   */
  data: CompileData
  /**
   * Stack of nodes.
   */
  stack: Array<Fragment | Nodes>
  /**
   * Stack of tokens.
   */
  tokenStack: Array<TokenTuple>

  /**
   * Capture some of the output data.
   *
   * @param this
   *   Context.
   * @returns
   *   Nothing.
   */
  buffer(this: CompileContext): undefined

  /**
   * Enter a node.
   *
   * @param this
   *   Context.
   * @param node
   *   Node.
   * @param token
   *   Token.
   * @param onError
   *   Error handler.
   * @returns
   *   Nothing.
   */
  enter(
    this: CompileContext,
    node: Nodes,
    token: Token,
    onError?: OnEnterError | null | undefined
  ): undefined

  /**
   * Exit a node.
   *
   * @param this
   *   Context.
   * @param token
   *   Token.
   * @param onError
   *   Error handler.
   * @returns
   *   Nothing.
   */
  exit(
    this: CompileContext,
    token: Token,
    onError?: OnExitError | null | undefined
  ): undefined

  /**
   * Stop capturing and access the output data.
   *
   * @param this
   *   Context.
   * @returns
   *   Nothing.
   */
  resume(this: CompileContext): string

  /**
   * Get the source text that spans a token (or location).
   *
   * @param token
   *   Start/end in stream.
   * @param expandTabs
   *   Whether to expand tabs.
   * @returns
   *   Serialized chunks.
   */
  sliceSerialize(
    token: Pick<Token, 'end' | 'start'>,
    expandTabs?: boolean | undefined
  ): string
}

/**
 * Interface of tracked data.
 *
 * When working on extensions that use more data, extend the corresponding
 * interface to register their types:
 *
 * ```ts
 * declare module 'mdast-util-from-markdown' {
 *   interface CompileData {
 *     // Register a new field.
 *     mathFlowInside?: boolean | undefined
 *   }
 * }
 * ```
 */
export interface CompileData {
  /**
   * Whether we’re inside a hard break.
   */
  atHardBreak?: boolean | undefined

  /**
   * Current character reference type.
   */
  characterReferenceType?:
    | 'characterReferenceMarkerHexadecimal'
    | 'characterReferenceMarkerNumeric'
    | undefined

  /**
   * Whether a first list item value (`1` in `1. a`) is expected.
   */
  expectingFirstListItemValue?: boolean | undefined

  /**
   * Whether we’re in flow code.
   */
  flowCodeInside?: boolean | undefined

  /**
   * Whether we’re in a reference.
   */
  inReference?: boolean | undefined

  /**
   * Whether we’re expecting a line ending from a setext heading, which can be slurped.
   */
  setextHeadingSlurpLineEnding?: boolean | undefined

  /**
   * Current reference.
   */
  referenceType?: 'collapsed' | 'full' | undefined
}

/**
 * Configuration.
 *
 * We have our defaults, but extensions will add more.
 */
export interface Config {
  /**
   * Token types where line endings are used.
   */
  canContainEols: Array<string>
  /**
   * Opening handles.
   */
  enter: Handles
  /**
   * Closing handles.
   */
  exit: Handles
  /**
   * Tree transforms.
   */
  transforms: Array<Transform>
}

/**
 * Change how markdown tokens from micromark are turned into mdast.
 */
export interface Extension {
  /**
   * Token types where line endings are used.
   */
  canContainEols?: Array<string> | null | undefined
  /**
   * Opening handles.
   */
  enter?: Handles | null | undefined
  /**
   * Closing handles.
   */
  exit?: Handles | null | undefined
  /**
   * Tree transforms.
   */
  transforms?: Array<Transform> | null | undefined
}

/**
 * Internal fragment.
 */
export interface Fragment extends Parent {
  /**
   * Node type.
   */
  type: 'fragment'
  /**
   * Children.
   */
  children: Array<PhrasingContent>
}

/**
 * Token types mapping to handles
 */
export type Handles = Record<string, Handle>

/**
 * Handle a token.
 *
 * @param this
 *   Context.
 * @param token
 *   Current token.
 * @returns
 *   Nothing.
 */
export type Handle = (this: CompileContext, token: Token) => undefined | void

/**
 * Handle the case where the `right` token is open, but it is closed (by the
 * `left` token) or because we reached the end of the document.
 *
 * @param this
 *   Context.
 * @param left
 *   Left token.
 * @param right
 *   Right token.
 * @returns
 *   Nothing.
 */
export type OnEnterError = (
  this: Omit<CompileContext, 'sliceSerialize'>,
  left: Token | undefined,
  right: Token
) => undefined

/**
 * Handle the case where the `right` token is open but it is closed by
 * exiting the `left` token.
 *
 * @param this
 *   Context.
 * @param left
 *   Left token.
 * @param right
 *   Right token.
 * @returns
 *   Nothing.
 */
export type OnExitError = (
  this: Omit<CompileContext, 'sliceSerialize'>,
  left: Token,
  right: Token
) => undefined

/**
 * Configuration.
 */
export interface Options extends ParseOptions {
  /**
   * Extensions for this utility to change how tokens are turned into a tree.
   */
  mdastExtensions?: Array<Extension | Array<Extension>> | null | undefined
}

/**
 * Open token on the stack,
 * with an optional error handler for when that token isn’t closed properly.
 */
export type TokenTuple = [token: Token, onError: OnEnterError | undefined]

/**
 * Extra transform, to change the AST afterwards.
 *
 * @param tree
 *   Tree to transform.
 * @returns
 *   New tree or nothing (in which case the current tree is used).
 */
export type Transform = (tree: Root) => Root | null | undefined | void
