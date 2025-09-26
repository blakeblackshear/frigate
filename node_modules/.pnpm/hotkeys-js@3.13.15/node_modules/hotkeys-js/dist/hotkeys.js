/**! 
 * hotkeys-js v3.13.15 
 * A simple micro-library for defining and dispatching keyboard shortcuts. It has no dependencies. 
 * 
 * Copyright (c) 2025 kenny wong <wowohoo@qq.com> 
 * https://github.com/jaywcjlove/hotkeys-js.git 
 * 
 * @website: https://jaywcjlove.github.io/hotkeys-js
 
 * Licensed under the MIT license 
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.hotkeys = factory());
})(this, (function () { 'use strict';

  const isff = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase().indexOf('firefox') > 0 : false;

  /** Bind event */
  function addEvent(object, event, method, useCapture) {
    if (object.addEventListener) {
      object.addEventListener(event, method, useCapture);
    } else if (object.attachEvent) {
      object.attachEvent("on".concat(event), method);
    }
  }
  function removeEvent(object, event, method, useCapture) {
    if (object.removeEventListener) {
      object.removeEventListener(event, method, useCapture);
    } else if (object.detachEvent) {
      object.detachEvent("on".concat(event), method);
    }
  }

  /** Convert modifier keys to their corresponding key codes */
  function getMods(modifier, key) {
    const mods = key.slice(0, key.length - 1);
    for (let i = 0; i < mods.length; i++) mods[i] = modifier[mods[i].toLowerCase()];
    return mods;
  }

  /** Process the input key string and convert it to an array */
  function getKeys(key) {
    if (typeof key !== 'string') key = '';
    key = key.replace(/\s/g, ''); // Match any whitespace character, including spaces, tabs, form feeds, etc.
    const keys = key.split(','); // Allow multiple shortcuts separated by ','
    let index = keys.lastIndexOf('');

    // Shortcut may include ',' — special handling needed
    for (; index >= 0;) {
      keys[index - 1] += ',';
      keys.splice(index, 1);
      index = keys.lastIndexOf('');
    }
    return keys;
  }

  /** Compare arrays of modifier keys */
  function compareArray(a1, a2) {
    const arr1 = a1.length >= a2.length ? a1 : a2;
    const arr2 = a1.length >= a2.length ? a2 : a1;
    let isIndex = true;
    for (let i = 0; i < arr1.length; i++) {
      if (arr2.indexOf(arr1[i]) === -1) isIndex = false;
    }
    return isIndex;
  }

  // Special Keys
  const _keyMap = {
    backspace: 8,
    '⌫': 8,
    tab: 9,
    clear: 12,
    enter: 13,
    '↩': 13,
    return: 13,
    esc: 27,
    escape: 27,
    space: 32,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    /// https://w3c.github.io/uievents/#events-keyboard-key-location
    arrowup: 38,
    arrowdown: 40,
    arrowleft: 37,
    arrowright: 39,
    del: 46,
    delete: 46,
    ins: 45,
    insert: 45,
    home: 36,
    end: 35,
    pageup: 33,
    pagedown: 34,
    capslock: 20,
    num_0: 96,
    num_1: 97,
    num_2: 98,
    num_3: 99,
    num_4: 100,
    num_5: 101,
    num_6: 102,
    num_7: 103,
    num_8: 104,
    num_9: 105,
    num_multiply: 106,
    num_add: 107,
    num_enter: 108,
    num_subtract: 109,
    num_decimal: 110,
    num_divide: 111,
    '⇪': 20,
    ',': 188,
    '.': 190,
    '/': 191,
    '`': 192,
    '-': isff ? 173 : 189,
    '=': isff ? 61 : 187,
    ';': isff ? 59 : 186,
    '\'': 222,
    '{': 219,
    '}': 221,
    '[': 219,
    ']': 221,
    '\\': 220
  };

  // Modifier Keys
  const _modifier = {
    // shiftKey
    '⇧': 16,
    shift: 16,
    // altKey
    '⌥': 18,
    alt: 18,
    option: 18,
    // ctrlKey
    '⌃': 17,
    ctrl: 17,
    control: 17,
    // metaKey
    '⌘': 91,
    cmd: 91,
    meta: 91,
    command: 91
  };
  const modifierMap = {
    16: 'shiftKey',
    18: 'altKey',
    17: 'ctrlKey',
    91: 'metaKey',
    shiftKey: 16,
    ctrlKey: 17,
    altKey: 18,
    metaKey: 91
  };
  const _mods = {
    16: false,
    18: false,
    17: false,
    91: false
  };
  const _handlers = {};

  // F1~F12 special key
  for (let k = 1; k < 20; k++) {
    _keyMap["f".concat(k)] = 111 + k;
  }

  /** Record the pressed keys */
  let _downKeys = [];
  /** Whether the window has already listened to the focus event */
  let winListendFocus = null;
  /** Default hotkey scope */
  let _scope = 'all';
  /** Map to record elements with bound events */
  const elementEventMap = new Map();

  /** Return key code */
  const code = x => _keyMap[x.toLowerCase()] || _modifier[x.toLowerCase()] || x.toUpperCase().charCodeAt(0);
  const getKey = x => Object.keys(_keyMap).find(k => _keyMap[k] === x);
  const getModifier = x => Object.keys(_modifier).find(k => _modifier[k] === x);

  /** Set or get the current scope (defaults to 'all') */
  function setScope(scope) {
    _scope = scope || 'all';
  }
  /** Get the current scope */
  function getScope() {
    return _scope || 'all';
  }
  /** Get the key codes of the currently pressed keys */
  function getPressedKeyCodes() {
    return _downKeys.slice(0);
  }
  function getPressedKeyString() {
    return _downKeys.map(c => getKey(c) || getModifier(c) || String.fromCharCode(c));
  }
  function getAllKeyCodes() {
    const result = [];
    Object.keys(_handlers).forEach(k => {
      _handlers[k].forEach(_ref => {
        let {
          key,
          scope,
          mods,
          shortcut
        } = _ref;
        result.push({
          scope,
          shortcut,
          mods,
          keys: key.split('+').map(v => code(v))
        });
      });
    });
    return result;
  }

  /** hotkey is effective only when filter return true */
  function filter(event) {
    const target = event.target || event.srcElement;
    const {
      tagName
    } = target;
    let flag = true;
    const isInput = tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button', 'file', 'reset', 'submit', 'color'].includes(target.type);
    // ignore: isContentEditable === 'true', <input> and <textarea> when readOnly state is false, <select>
    if (target.isContentEditable || (isInput || tagName === 'TEXTAREA' || tagName === 'SELECT') && !target.readOnly) {
      flag = false;
    }
    return flag;
  }

  /** Determine whether the pressed key matches a specific key, returns true or false */
  function isPressed(keyCode) {
    if (typeof keyCode === 'string') {
      keyCode = code(keyCode); // Convert to key code
    }
    return _downKeys.indexOf(keyCode) !== -1;
  }

  /** Loop through and delete all handlers with the specified scope */
  function deleteScope(scope, newScope) {
    let handlers;
    let i;

    // If no scope is specified, get the current scope
    if (!scope) scope = getScope();
    for (const key in _handlers) {
      if (Object.prototype.hasOwnProperty.call(_handlers, key)) {
        handlers = _handlers[key];
        for (i = 0; i < handlers.length;) {
          if (handlers[i].scope === scope) {
            const deleteItems = handlers.splice(i, 1);
            deleteItems.forEach(_ref2 => {
              let {
                element
              } = _ref2;
              return removeKeyEvent(element);
            });
          } else {
            i++;
          }
        }
      }
    }

    // If the current scope has been deleted, reset the scope to 'all'
    if (getScope() === scope) setScope(newScope || 'all');
  }

  /** Clear modifier keys */
  function clearModifier(event) {
    let key = event.keyCode || event.which || event.charCode;
    if (event.key && event.key.toLowerCase() === 'capslock') {
      // Ensure that when capturing keystrokes in modern browsers,
      // uppercase and lowercase letters (such as R and r) return the same key value.
      // https://github.com/jaywcjlove/hotkeys-js/pull/514
      // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
      key = code(event.key);
    }
    const i = _downKeys.indexOf(key);

    // Remove the pressed key from the list
    if (i >= 0) {
      _downKeys.splice(i, 1);
    }
    // Special handling for the command key: fix the issue where keyup only triggers once for command combos
    if (event.key && event.key.toLowerCase() === 'meta') {
      _downKeys.splice(0, _downKeys.length);
    }

    // Clear modifier keys: shiftKey, altKey, ctrlKey, (command || metaKey)
    if (key === 93 || key === 224) key = 91;
    if (key in _mods) {
      _mods[key] = false;

      // Reset the modifier key status to false
      for (const k in _modifier) if (_modifier[k] === key) hotkeys[k] = false;
    }
  }
  function unbind(keysInfo) {
    // unbind(), unbind all keys
    if (typeof keysInfo === 'undefined') {
      Object.keys(_handlers).forEach(key => {
        Array.isArray(_handlers[key]) && _handlers[key].forEach(info => eachUnbind(info));
        delete _handlers[key];
      });
      removeKeyEvent(null);
    } else if (Array.isArray(keysInfo)) {
      // support like : unbind([{key: 'ctrl+a', scope: 's1'}, {key: 'ctrl-a', scope: 's2', splitKey: '-'}])
      keysInfo.forEach(info => {
        if (info.key) eachUnbind(info);
      });
    } else if (typeof keysInfo === 'object') {
      // support like unbind({key: 'ctrl+a, ctrl+b', scope:'abc'})
      if (keysInfo.key) eachUnbind(keysInfo);
    } else if (typeof keysInfo === 'string') {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      // support old method
      // eslint-disable-line
      let [scope, method] = args;
      if (typeof scope === 'function') {
        method = scope;
        scope = '';
      }
      eachUnbind({
        key: keysInfo,
        scope,
        method,
        splitKey: '+'
      });
    }
  }

  /** Unbind hotkeys for a specific scope */
  const eachUnbind = _ref3 => {
    let {
      key,
      scope,
      method,
      splitKey = '+'
    } = _ref3;
    const multipleKeys = getKeys(key);
    multipleKeys.forEach(originKey => {
      const unbindKeys = originKey.split(splitKey);
      const len = unbindKeys.length;
      const lastKey = unbindKeys[len - 1];
      const keyCode = lastKey === '*' ? '*' : code(lastKey);
      if (!_handlers[keyCode]) return;
      // If scope is not provided, get the current scope
      if (!scope) scope = getScope();
      const mods = len > 1 ? getMods(_modifier, unbindKeys) : [];
      const unbindElements = [];
      _handlers[keyCode] = _handlers[keyCode].filter(record => {
        // Check if the method matches; if method is provided, must be equal to unbind
        const isMatchingMethod = method ? record.method === method : true;
        const isUnbind = isMatchingMethod && record.scope === scope && compareArray(record.mods, mods);
        if (isUnbind) unbindElements.push(record.element);
        return !isUnbind;
      });
      unbindElements.forEach(element => removeKeyEvent(element));
    });
  };

  /** Handle the callback function for the corresponding hotkey */
  function eventHandler(event, handler, scope, element) {
    if (handler.element !== element) {
      return;
    }
    let modifiersMatch;

    // Check if it is within the current scope
    if (handler.scope === scope || handler.scope === 'all') {
      // Check whether modifier keys match (returns true if they do)
      modifiersMatch = handler.mods.length > 0;
      for (const y in _mods) {
        if (Object.prototype.hasOwnProperty.call(_mods, y)) {
          if (!_mods[y] && handler.mods.indexOf(+y) > -1 || _mods[y] && handler.mods.indexOf(+y) === -1) {
            modifiersMatch = false;
          }
        }
      }

      // Call the handler function; ignore if it's only a modifier key
      if (handler.mods.length === 0 && !_mods[16] && !_mods[18] && !_mods[17] && !_mods[91] || modifiersMatch || handler.shortcut === '*') {
        handler.keys = [];
        handler.keys = handler.keys.concat(_downKeys);
        if (handler.method(event, handler) === false) {
          if (event.preventDefault) event.preventDefault();else event.returnValue = false;
          if (event.stopPropagation) event.stopPropagation();
          if (event.cancelBubble) event.cancelBubble = true;
        }
      }
    }
  }

  /** Handle the keydown event */
  function dispatch(event, element) {
    const asterisk = _handlers['*'];
    let key = event.keyCode || event.which || event.charCode;
    // Ensure that when capturing keystrokes in modern browsers,
    // uppercase and lowercase letters (such as R and r) return the same key value.
    // https://github.com/jaywcjlove/hotkeys-js/pull/514
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
    // CapsLock key
    // There's an issue where `keydown` and `keyup` events are not triggered after CapsLock is enabled to activate uppercase.
    if (event.key && event.key.toLowerCase() === 'capslock') {
      return;
    }
    // Form control filter: by default, shortcut keys are not triggered in form elements
    if (!hotkeys.filter.call(this, event)) return;

    // In Gecko (Firefox), the command key code is 224; unify it with WebKit (Chrome)
    // In WebKit, left and right command keys have different codes
    if (key === 93 || key === 224) key = 91;

    /**
     * Collect bound keys
     * If an Input Method Editor is processing key input and the event is keydown, return 229.
     * https://stackoverflow.com/questions/25043934/is-it-ok-to-ignore-keydown-events-with-keycode-229
     * http://lists.w3.org/Archives/Public/www-dom/2010JulSep/att-0182/keyCode-spec.html
     */
    if (_downKeys.indexOf(key) === -1 && key !== 229) _downKeys.push(key);
    /**
     * Jest test cases are required.
     * ===============================
     */
    ['metaKey', 'ctrlKey', 'altKey', 'shiftKey'].forEach(keyName => {
      const keyNum = modifierMap[keyName];
      if (event[keyName] && _downKeys.indexOf(keyNum) === -1) {
        _downKeys.push(keyNum);
      } else if (!event[keyName] && _downKeys.indexOf(keyNum) > -1) {
        _downKeys.splice(_downKeys.indexOf(keyNum), 1);
      } else if (keyName === 'metaKey' && event[keyName]) {
        // If the command key is pressed, clear all non-modifier keys except the current event key.
        // This is because keyup for non-modifier keys will NEVER be triggered when command is pressed.
        // This is a known browser limitation.
        _downKeys = _downKeys.filter(k => k in modifierMap || k === key);
      }
    });
    /**
     * -------------------------------
     */
    if (key in _mods) {
      _mods[key] = true;
      // Register special modifier keys to the `hotkeys` object
      for (const k in _modifier) {
        if (Object.prototype.hasOwnProperty.call(_modifier, k)) {
          const eventKey = modifierMap[_modifier[k]];
          hotkeys[k] = event[eventKey];
        }
      }
      if (!asterisk) return;
    }

    // Bind the modifier keys in modifierMap to the event
    for (const e in _mods) {
      if (Object.prototype.hasOwnProperty.call(_mods, e)) {
        _mods[e] = event[modifierMap[e]];
      }
    }
    /**
     * https://github.com/jaywcjlove/hotkeys/pull/129
     * This solves the issue in Firefox on Windows where hotkeys corresponding to special characters would not trigger.
     * An example of this is ctrl+alt+m on a Swedish keyboard which is used to type μ.
     * Browser support: https://caniuse.com/#feat=keyboardevent-getmodifierstate
     */
    if (event.getModifierState && !(event.altKey && !event.ctrlKey) && event.getModifierState('AltGraph')) {
      if (_downKeys.indexOf(17) === -1) {
        _downKeys.push(17);
      }
      if (_downKeys.indexOf(18) === -1) {
        _downKeys.push(18);
      }
      _mods[17] = true;
      _mods[18] = true;
    }

    // Get the current scope (defaults to 'all')
    const scope = getScope();
    // Handle any hotkeys registered as '*'
    if (asterisk) {
      for (let i = 0; i < asterisk.length; i++) {
        if (asterisk[i].scope === scope && (event.type === 'keydown' && asterisk[i].keydown || event.type === 'keyup' && asterisk[i].keyup)) {
          eventHandler(event, asterisk[i], scope, element);
        }
      }
    }
    // If the key is not registered, return
    if (!(key in _handlers)) return;
    const handlerKey = _handlers[key];
    const keyLen = handlerKey.length;
    for (let i = 0; i < keyLen; i++) {
      if (event.type === 'keydown' && handlerKey[i].keydown || event.type === 'keyup' && handlerKey[i].keyup) {
        if (handlerKey[i].key) {
          const record = handlerKey[i];
          const {
            splitKey
          } = record;
          const keyShortcut = record.key.split(splitKey);
          const _downKeysCurrent = []; // Store the current key codes
          for (let a = 0; a < keyShortcut.length; a++) {
            _downKeysCurrent.push(code(keyShortcut[a]));
          }
          if (_downKeysCurrent.sort().join('') === _downKeys.sort().join('')) {
            // Match found, call the handler
            eventHandler(event, record, scope, element);
          }
        }
      }
    }
  }
  function hotkeys(key, option, method) {
    _downKeys = [];
    /** List of hotkeys to handle */
    const keys = getKeys(key);
    let mods = [];
    /** Default scope is 'all', meaning effective in all scopes */
    let scope = 'all';
    /** Element to which the hotkey events are bound */
    let element = document;
    let i = 0;
    let keyup = false;
    let keydown = true;
    let splitKey = '+';
    let capture = false;
    /** Allow only a single callback */
    let single = false;

    // Determine if the second argument is a function (no options provided)
    if (method === undefined && typeof option === 'function') {
      method = option;
    }

    // Parse options object
    if (Object.prototype.toString.call(option) === '[object Object]') {
      if (option.scope) scope = option.scope; // Set scope
      if (option.element) element = option.element; // Set binding element
      if (option.keyup) keyup = option.keyup;
      if (option.keydown !== undefined) keydown = option.keydown;
      if (option.capture !== undefined) capture = option.capture;
      if (typeof option.splitKey === 'string') splitKey = option.splitKey;
      if (option.single === true) single = true;
    }
    if (typeof option === 'string') scope = option;

    // If only one callback is allowed, unbind the existing one first
    if (single) unbind(key, scope);

    // Handle each hotkey
    for (; i < keys.length; i++) {
      key = keys[i].split(splitKey); // Split into individual keys
      mods = [];

      // If it's a combination, extract modifier keys
      if (key.length > 1) mods = getMods(_modifier, key);

      // Convert non-modifier key to key code
      key = key[key.length - 1];
      key = key === '*' ? '*' : code(key); // '*' means match all hotkeys

      // Initialize handler array if this key has no handlers yet
      if (!(key in _handlers)) _handlers[key] = [];
      _handlers[key].push({
        keyup,
        keydown,
        scope,
        mods,
        shortcut: keys[i],
        method,
        key: keys[i],
        splitKey,
        element
      });
    }
    // Register hotkey event listeners on the global document
    if (typeof element !== 'undefined' && window) {
      if (!elementEventMap.has(element)) {
        const keydownListener = function () {
          let event = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : window.event;
          return dispatch(event, element);
        };
        const keyupListenr = function () {
          let event = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : window.event;
          dispatch(event, element);
          clearModifier(event);
        };
        elementEventMap.set(element, {
          keydownListener,
          keyupListenr,
          capture
        });
        addEvent(element, 'keydown', keydownListener, capture);
        addEvent(element, 'keyup', keyupListenr, capture);
      }
      // Register focus event listener once to clear pressed keys on window focus
      if (!winListendFocus) {
        const listener = () => {
          _downKeys = [];
        };
        winListendFocus = {
          listener,
          capture
        };
        addEvent(window, 'focus', listener, capture);
      }
    }
  }
  function trigger(shortcut) {
    let scope = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'all';
    Object.keys(_handlers).forEach(key => {
      const dataList = _handlers[key].filter(item => item.scope === scope && item.shortcut === shortcut);
      dataList.forEach(data => {
        if (data && data.method) {
          data.method();
        }
      });
    });
  }

  /** Clean up event listeners. After unbinding, check whether the element still has any hotkeys bound. If not, remove its event listeners. */
  function removeKeyEvent(element) {
    const values = Object.values(_handlers).flat();
    const findindex = values.findIndex(_ref4 => {
      let {
        element: el
      } = _ref4;
      return el === element;
    });
    if (findindex < 0) {
      const {
        keydownListener,
        keyupListenr,
        capture
      } = elementEventMap.get(element) || {};
      if (keydownListener && keyupListenr) {
        removeEvent(element, 'keyup', keyupListenr, capture);
        removeEvent(element, 'keydown', keydownListener, capture);
        elementEventMap.delete(element);
      }
    }
    if (values.length <= 0 || elementEventMap.size <= 0) {
      // Remove all event listeners from all elements
      const eventKeys = Object.keys(elementEventMap);
      eventKeys.forEach(el => {
        const {
          keydownListener,
          keyupListenr,
          capture
        } = elementEventMap.get(el) || {};
        if (keydownListener && keyupListenr) {
          removeEvent(el, 'keyup', keyupListenr, capture);
          removeEvent(el, 'keydown', keydownListener, capture);
          elementEventMap.delete(el);
        }
      });
      // Clear the elementEventMap
      elementEventMap.clear();
      // Clear all handlers
      Object.keys(_handlers).forEach(key => delete _handlers[key]);
      // Remove the global window focus event listener
      if (winListendFocus) {
        const {
          listener,
          capture
        } = winListendFocus;
        removeEvent(window, 'focus', listener, capture);
        winListendFocus = null;
      }
    }
  }
  const _api = {
    getPressedKeyString,
    setScope,
    getScope,
    deleteScope,
    getPressedKeyCodes,
    getAllKeyCodes,
    isPressed,
    filter,
    trigger,
    unbind,
    keyMap: _keyMap,
    modifier: _modifier,
    modifierMap
  };
  for (const a in _api) {
    if (Object.prototype.hasOwnProperty.call(_api, a)) {
      hotkeys[a] = _api[a];
    }
  }
  if (typeof window !== 'undefined') {
    const _hotkeys = window.hotkeys;
    hotkeys.noConflict = deep => {
      if (deep && window.hotkeys === hotkeys) {
        window.hotkeys = _hotkeys;
      }
      return hotkeys;
    };
    window.hotkeys = hotkeys;
  }

  return hotkeys;

}));
