export interface HotkeysEvent {
  key: string;
  keys: number[];
  method: KeyHandler;
  mods: number[];
  scope: string;
  shortcut: string;
}

export interface KeyHandler {
  (keyboardEvent: KeyboardEvent, hotkeysEvent: HotkeysEvent): void | boolean;
}

type Options = {
  scope?: string;
  element?: HTMLElement | null;
  keyup?: boolean | null;
  keydown?: boolean | null;
  capture?: boolean
  splitKey?: string;
  single?: boolean;
}

export interface Hotkeys {
  (key: string, method: KeyHandler): void;
  (key: string, scope: string, method: KeyHandler): void;
  (key: string, options: Options, method: KeyHandler): void;

  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  option: boolean;
  control: boolean;
  cmd: boolean;
  command: boolean;

  keyMap: Record<string, number>;
  modifier: Record<string, number>;
  modifierMap: Record<string, number | string>;

  /**
   * Use the `hotkeys.setScope` method to set scope. There can only be one active scope besides 'all'.  By default 'all' is always active.
   *
   * ```js
   * // Define shortcuts with a scope
   * hotkeys('ctrl+o, ctrl+alt+enter', 'issues', function() {
   *   console.log('do something');
   * });
   * hotkeys('o, enter', 'files', function() {
   *   console.log('do something else');
   * });
   *
   * // Set the scope (only 'all' and 'issues' shortcuts will be honored)
   * hotkeys.setScope('issues'); // default scope is 'all'
   * ```
   */
  setScope(scopeName: string): void;
  /**
   * Use the `hotkeys.getScope` method to get scope.
   *
   * ```js
   * hotkeys.getScope();
   * ```
   */
  getScope(): string;
  /**
   * Use the `hotkeys.deleteScope` method to delete a scope. This will also remove all associated hotkeys with it.
   *
   * ```js
   * hotkeys.deleteScope('issues');
   * ```
   * You can use second argument, if need set new scope after deleting.
   *
   * ```js
   * hotkeys.deleteScope('issues', 'newScopeName');
   * ```
   */
  deleteScope(scopeName: string, newScopeName?: string): void;

  /**
   * Relinquish HotKeys’s control of the `hotkeys` variable.
   *
   * ```js
   * var k = hotkeys.noConflict();
   * k('a', function() {
   *   console.log("do something")
   * });
   *
   * hotkeys()
   * // -->Uncaught TypeError: hotkeys is not a function(anonymous function)
   * // @ VM2170:2InjectedScript._evaluateOn
   * // @ VM2165:883InjectedScript._evaluateAndWrap
   * // @ VM2165:816InjectedScript.evaluate @ VM2165:682
   * ```
   */
  noConflict(): Hotkeys;

  /**
   * trigger shortcut key event
   *
   * ```js
   * hotkeys.trigger('ctrl+o');
   * hotkeys.trigger('ctrl+o', 'scope2');
   * ```
   */
  trigger(shortcut: string, scope?: string): void;

  unbind(key?: string): void;
  unbind(key: string, scopeName: string): void;
  unbind(key: string, scopeName: string, method: KeyHandler): void;
  unbind(key: string, method: KeyHandler): void;

  /** For example, `hotkeys.isPressed(77)` is true if the `M` key is currently pressed. */
  isPressed(keyCode: number): boolean;
  /** For example, `hotkeys.isPressed('m')` is true if the `M` key is currently pressed. */
  isPressed(keyCode: string): boolean;
  /**
   * Returns an array of key codes currently pressed.
   *
   * ```js
   * hotkeys('command+ctrl+shift+a,f', function() {
   *   console.log(hotkeys.getPressedKeyCodes()); //=> [17, 65] or [70]
   * })
   * ```
   */
  getPressedKeyCodes(): number[];
  /**
   * Returns an array of key codes currently pressed.
   *
   * ```js
   * hotkeys('command+ctrl+shift+a,f', function() {
   *   console.log(hotkeys.getPressedKeyString()); //=> ['⌘', '⌃', '⇧', 'A', 'F']
   * })
   * ```
   */
  getPressedKeyString(): string[];
  /**
   * Get a list of all registration codes.
   *
   * ```js
   * hotkeys('command+ctrl+shift+a,f', function() {
   *   console.log(hotkeys.getAllKeyCodes());
   *   // [
   *   //   { scope: 'all', shortcut: 'command+ctrl+shift+a', mods: [91, 17, 16], keys: [91, 17, 16, 65] },
   *   //   { scope: 'all', shortcut: 'f', mods: [], keys: [42] }
   *   // ]
   * })
   * ```
   *
   */
  getAllKeyCodes(): Omit<HotkeysEvent, 'method' | 'key'>[];

  /**
   * By default hotkeys are not enabled for `INPUT` `SELECT` `TEXTAREA` elements.
   * `Hotkeys.filter` to return to the `true` shortcut keys set to play a role,
   * `false` shortcut keys set up failure.
   *
   * ```js
   * hotkeys.filter = function(event){
   *   return true;
   * }
   * //How to add the filter to edit labels. <div contentEditable="true"></div>
   * //"contentEditable" Older browsers that do not support drops
   * hotkeys.filter = function(event) {
   *   var target = event.target || event.srcElement;
   *   var tagName = target.tagName;
   *   return !(target.isContentEditable || tagName == 'INPUT' || tagName == 'SELECT' || tagName == 'TEXTAREA');
   * }
   *
   * hotkeys.filter = function(event){
   *   var tagName = (event.target || event.srcElement).tagName;
   *   hotkeys.setScope(/^(INPUT|TEXTAREA|SELECT)$/.test(tagName) ? 'input' : 'other');
   *   return true;
   * }
   * ```
   */
  filter(event: KeyboardEvent): boolean;
}
// https://github.com/eiriklv/react-masonry-component/issues/57
declare var hotkeys: Hotkeys;
export default hotkeys;
