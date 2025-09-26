import type {Node} from 'estree'

/**
 * Scope.
 */
export interface Scope {
  /**
   * Whether this is a block scope or not;
   * blocks are things made by `for` and `try` and `if`;
   * non-blocks are functions and the top-level scope.
   */
  block: boolean
  /**
   * Identifiers that are defined in this scope.
   */
  defined: Array<string>
}

/**
 * State to track what’s defined;
 * contains `enter`, `exit` callbacks you must call and `scopes`.
 */
export interface Visitors {
  /**
   * List of scopes;
   * the first scope is the top-level scope;
   * the last scope is the current scope.
   */
  scopes: [topLevel: Scope, ...rest: Array<Scope>]
  /**
   * Callback you must call when entering a node.
   *
   * @param node
   *   Node.
   * @returns
   *   Nothing.
   */
  enter(node: Node): undefined
  /**
   * Callback you must call when exiting (leaving) a node.
   *
   * @param node
   *   Node.
   * @returns
   *   Nothing.
   */
  exit(node: Node): undefined
}
