const kDefaultPrevented = Symbol("kDefaultPrevented");
const kPropagationStopped = Symbol("kPropagationStopped");
const kImmediatePropagationStopped = Symbol("kImmediatePropagationStopped");
class TypedEvent extends MessageEvent {
  /**
   * @note Keep a placeholder property with the return type
   * because the type must be set somewhere in order to be
   * correctly associated and inferred from the event.
   */
  #returnType;
  [kDefaultPrevented];
  [kPropagationStopped];
  [kImmediatePropagationStopped];
  constructor(...args) {
    super(args[0], args[1]);
    this[kDefaultPrevented] = false;
  }
  get defaultPrevented() {
    return this[kDefaultPrevented];
  }
  preventDefault() {
    super.preventDefault();
    this[kDefaultPrevented] = true;
  }
  stopImmediatePropagation() {
    super.stopImmediatePropagation();
    this[kImmediatePropagationStopped] = true;
  }
}
const kListenerOptions = Symbol("kListenerOptions");
class Emitter {
  #listeners;
  constructor() {
    this.#listeners = {};
  }
  /**
   * Adds a listener for the given event type.
   *
   * @returns {AbortController} An `AbortController` that can be used to remove the listener.
   */
  on(type, listener, options) {
    return this.#addListener(type, listener, options);
  }
  /**
   * Adds a one-time listener for the given event type.
   *
   * @returns {AbortController} An `AbortController` that can be used to remove the listener.
   */
  once(type, listener, options) {
    return this.on(type, listener, { ...options || {}, once: true });
  }
  /**
   * Prepends a listener for the given event type.
   *
   * @returns {AbortController} An `AbortController` that can be used to remove the listener.
   */
  earlyOn(type, listener, options) {
    return this.#addListener(type, listener, options, "prepend");
  }
  /**
   * Prepends a one-time listener for the given event type.
   */
  earlyOnce(type, listener, options) {
    return this.earlyOn(type, listener, { ...options || {}, once: true });
  }
  /**
   * Emits the given typed event.
   *
   * @returns {boolean} Returns `true` if the event had any listeners, `false` otherwise.
   */
  emit(event) {
    if (this.listenerCount(event.type) === 0) {
      return false;
    }
    const proxiedEvent = this.#proxyEvent(event);
    for (const listener of this.#listeners[event.type]) {
      if (proxiedEvent.event[kPropagationStopped] != null && proxiedEvent.event[kPropagationStopped] !== this) {
        return false;
      }
      if (proxiedEvent.event[kImmediatePropagationStopped]) {
        break;
      }
      this.#callListener(proxiedEvent.event, listener);
    }
    proxiedEvent.revoke();
    return true;
  }
  /**
   * Emits the given typed event and returns a promise that resolves
   * when all the listeners for that event have settled.
   *
   * @returns {Promise<Array<Emitter.ListenerReturnType>>} A promise that resolves
   * with the return values of all listeners.
   */
  async emitAsPromise(event) {
    if (this.listenerCount(event.type) === 0) {
      return [];
    }
    const pendingListeners = [];
    const proxiedEvent = this.#proxyEvent(event);
    for (const listener of this.#listeners[event.type]) {
      if (proxiedEvent.event[kPropagationStopped] != null && proxiedEvent.event[kPropagationStopped] !== this) {
        return [];
      }
      if (proxiedEvent.event[kImmediatePropagationStopped]) {
        break;
      }
      pendingListeners.push(
        // Awaiting individual listeners guarantees their call order.
        await Promise.resolve(this.#callListener(proxiedEvent.event, listener))
      );
    }
    proxiedEvent.revoke();
    return Promise.allSettled(pendingListeners).then((results) => {
      return results.map(
        (result) => result.status === "fulfilled" ? result.value : result.reason
      );
    });
  }
  /**
   * Emits the given event and returns a generator that yields
   * the result of each listener in the order of their registration.
   * This way, you stop exhausting the listeners once you get the expected value.
   */
  *emitAsGenerator(event) {
    if (this.listenerCount(event.type) === 0) {
      return;
    }
    const proxiedEvent = this.#proxyEvent(event);
    for (const listener of this.#listeners[event.type]) {
      if (proxiedEvent.event[kPropagationStopped] != null && proxiedEvent.event[kPropagationStopped] !== this) {
        return;
      }
      if (proxiedEvent.event[kImmediatePropagationStopped]) {
        break;
      }
      yield this.#callListener(proxiedEvent.event, listener);
    }
    proxiedEvent.revoke();
  }
  /**
   * Removes a listener for the given event type.
   */
  removeListener(type, listener) {
    if (this.listenerCount(type) === 0) {
      return;
    }
    const nextListeners = [];
    for (const existingListener of this.#listeners[type]) {
      if (existingListener !== listener) {
        nextListeners.push(existingListener);
      }
    }
    this.#listeners[type] = nextListeners;
  }
  /**
   * Removes all listeners for the given event type.
   * If no event type is provided, removes all existing listeners.
   */
  removeAllListeners(type) {
    if (type == null) {
      this.#listeners = {};
      return;
    }
    this.#listeners[type] = [];
  }
  /**
   * Returns the list of listeners for the given event type.
   * If no even type is provided, returns all listeners.
   */
  listeners(type) {
    if (type == null) {
      return Object.values(this.#listeners).flat();
    }
    return this.#listeners[type] || [];
  }
  /**
   * Returns the number of listeners for the given event type.
   * If no even type is provided, returns the total number of listeners.
   */
  listenerCount(type) {
    return this.listeners(type).length;
  }
  #addListener(type, listener, options, insertMode = "append") {
    this.#listeners[type] ??= [];
    if (insertMode === "prepend") {
      this.#listeners[type].unshift(listener);
    } else {
      this.#listeners[type].push(listener);
    }
    if (options) {
      Object.defineProperty(listener, kListenerOptions, {
        value: options,
        enumerable: false,
        writable: false
      });
      if (options.signal) {
        options.signal.addEventListener(
          "abort",
          () => {
            this.removeListener(type, listener);
          },
          { once: true }
        );
      }
    }
    return this;
  }
  #proxyEvent(event) {
    const { stopPropagation } = event;
    event.stopPropagation = new Proxy(event.stopPropagation, {
      apply: (target, thisArg, argArray) => {
        event[kPropagationStopped] = this;
        return Reflect.apply(target, thisArg, argArray);
      }
    });
    return {
      event,
      revoke() {
        event.stopPropagation = stopPropagation;
      }
    };
  }
  #callListener(event, listener) {
    const returnValue = listener.call(this, event);
    if (listener[kListenerOptions]?.once) {
      this.removeListener(event.type, listener);
    }
    return returnValue;
  }
}
export {
  Emitter,
  TypedEvent
};
//# sourceMappingURL=index.js.map