export type DefaultEventMap = {
  [eventType: string]: TypedEvent<any, any>
}

export interface TypedEvent<
  DataType = void,
  ReturnType = any,
  EventType extends string = string,
> extends Omit<MessageEvent<DataType>, 'type'> {
  type: EventType
}

const kDefaultPrevented = Symbol('kDefaultPrevented')
const kPropagationStopped = Symbol('kPropagationStopped')
const kImmediatePropagationStopped = Symbol('kImmediatePropagationStopped')

export class TypedEvent<
    DataType = void,
    ReturnType = any,
    EventType extends string = string,
  >
  extends MessageEvent<DataType>
  implements TypedEvent<DataType, ReturnType, EventType>
{
  /**
   * @note Keep a placeholder property with the return type
   * because the type must be set somewhere in order to be
   * correctly associated and inferred from the event.
   */
  #returnType: ReturnType;

  [kDefaultPrevented]: boolean;
  [kPropagationStopped]?: Emitter<any>;
  [kImmediatePropagationStopped]?: boolean

  constructor(
    ...args: [DataType] extends [void]
      ? [type: EventType]
      : [type: EventType, init: { data: DataType }]
  ) {
    super(args[0], args[1])
    this[kDefaultPrevented] = false
  }

  get defaultPrevented(): boolean {
    return this[kDefaultPrevented]
  }

  public preventDefault(): void {
    super.preventDefault()
    this[kDefaultPrevented] = true
  }

  public stopImmediatePropagation(): void {
    /**
     * @note Despite `.stopPropagation()` and `.stopImmediatePropagation()` being defined
     * in Node.js, they do nothing. It is safe to re-define them.
     */
    super.stopImmediatePropagation()
    this[kImmediatePropagationStopped] = true
  }
}

/**
 * Brands a TypedEvent or its subclass while preserving its (narrower) type.
 */
type Brand<Event extends TypedEvent, EventType extends string> = Event & {
  type: EventType
}

type InferEventMap<Target extends Emitter<any>> = Target extends Emitter<
  infer EventMap
>
  ? EventMap
  : never

type InternalListenersMap<
  Target extends Emitter<any>,
  EventMap extends DefaultEventMap = InferEventMap<Target>,
  EventType extends string = keyof EventMap & string,
> = Record<
  keyof EventMap,
  Array<Emitter.ListenerType<Target, EventType, EventMap>>
>

export type TypedListenerOptions = {
  once?: boolean
  signal?: AbortSignal
}

const kListenerOptions = Symbol('kListenerOptions')

export namespace Emitter {
  /**
   * Returns an appropriate `Event` type for the given event type.
   *
   * @example
   * const emitter = new Emitter<{ greeting: TypedEvent<string> }>()
   * type GreetingEvent = Emitter.InferEventType<typeof emitter, 'greeting'>
   * // TypedEvent<string>
   */
  export type EventType<
    Target extends Emitter<any>,
    EventType extends keyof EventMap & string,
    EventMap extends DefaultEventMap = InferEventMap<Target>,
  > = Brand<EventMap[EventType], EventType>

  export type EventDataType<
    Target extends Emitter<any>,
    EventType extends keyof EventMap & string,
    EventMap extends DefaultEventMap = InferEventMap<Target>,
  > = EventMap[EventType] extends TypedEvent<infer DataType> ? DataType : never

  /**
   * Returns the listener type for the given event type.
   *
   * @example
   * const emitter = new Emitter<{ getTotalPrice: TypedEvent<Cart, number> }>()
   * type Listener = Emitter.ListenerType<typeof emitter, 'getTotalPrice'>
   * // (event: TypedEvent<Cart>) => number
   */
  export type ListenerType<
    Target extends Emitter<any>,
    Type extends keyof EventMap & string,
    EventMap extends DefaultEventMap = InferEventMap<Target>,
  > = (
    event: Emitter.EventType<Target, Type, EventMap>,
  ) => Emitter.ListenerReturnType<Target, Type, EventMap> extends [void]
    ? void
    : Emitter.ListenerReturnType<Target, Type, EventMap>

  /**
   * Returns the return type of the listener for the given event type.
   *
   * @example
   * const emitter = new Emitter<{ getTotalPrice: TypedEvent<Cart, number> }>()
   * type ListenerReturnType = Emitter.InferListenerReturnType<typeof emitter, 'getTotalPrice'>
   * // number
   */
  export type ListenerReturnType<
    Target extends Emitter<any>,
    EventType extends keyof EventMap & string,
    EventMap extends DefaultEventMap = InferEventMap<Target>,
  > = EventMap[EventType] extends TypedEvent<unknown, infer ReturnType>
    ? ReturnType
    : never
}

export class Emitter<EventMap extends DefaultEventMap> {
  #listeners: InternalListenersMap<typeof this, EventMap>

  constructor() {
    this.#listeners = {} as InternalListenersMap<typeof this, EventMap>
  }

  /**
   * Adds a listener for the given event type.
   *
   * @returns {AbortController} An `AbortController` that can be used to remove the listener.
   */
  public on<EventType extends keyof EventMap & string>(
    type: EventType,
    listener: Emitter.ListenerType<typeof this, EventType, EventMap>,
    options?: TypedListenerOptions,
  ): typeof this {
    return this.#addListener(type, listener, options)
  }

  /**
   * Adds a one-time listener for the given event type.
   *
   * @returns {AbortController} An `AbortController` that can be used to remove the listener.
   */
  public once<EventType extends keyof EventMap & string>(
    type: EventType,
    listener: Emitter.ListenerType<typeof this, EventType, EventMap>,
    options?: Omit<TypedListenerOptions, 'once'>,
  ): typeof this {
    return this.on(type, listener, { ...(options || {}), once: true })
  }

  /**
   * Prepends a listener for the given event type.
   *
   * @returns {AbortController} An `AbortController` that can be used to remove the listener.
   */
  public earlyOn<EventType extends keyof EventMap & string>(
    type: EventType,
    listener: Emitter.ListenerType<typeof this, EventType, EventMap>,
    options?: TypedListenerOptions,
  ): typeof this {
    return this.#addListener(type, listener, options, 'prepend')
  }

  /**
   * Prepends a one-time listener for the given event type.
   */
  public earlyOnce<EventType extends keyof EventMap & string>(
    type: EventType,
    listener: Emitter.ListenerType<typeof this, EventType, EventMap>,
    options?: Omit<TypedListenerOptions, 'once'>,
  ): typeof this {
    return this.earlyOn(type, listener, { ...(options || {}), once: true })
  }

  /**
   * Emits the given typed event.
   *
   * @returns {boolean} Returns `true` if the event had any listeners, `false` otherwise.
   */
  public emit<EventType extends keyof EventMap & string>(
    event: Brand<EventMap[EventType], EventType>,
  ): boolean {
    if (this.listenerCount(event.type) === 0) {
      return false
    }

    const proxiedEvent = this.#proxyEvent(event)

    for (const listener of this.#listeners[event.type]) {
      if (
        proxiedEvent.event[kPropagationStopped] != null &&
        proxiedEvent.event[kPropagationStopped] !== this
      ) {
        return false
      }

      if (proxiedEvent.event[kImmediatePropagationStopped]) {
        break
      }

      this.#callListener(proxiedEvent.event, listener)
    }

    proxiedEvent.revoke()

    return true
  }

  /**
   * Emits the given typed event and returns a promise that resolves
   * when all the listeners for that event have settled.
   *
   * @returns {Promise<Array<Emitter.ListenerReturnType>>} A promise that resolves
   * with the return values of all listeners.
   */
  public async emitAsPromise<EventType extends keyof EventMap & string>(
    event: Brand<EventMap[EventType], EventType>,
  ): Promise<
    Array<Emitter.ListenerReturnType<typeof this, EventType, EventMap>>
  > {
    if (this.listenerCount(event.type) === 0) {
      return []
    }

    const pendingListeners: Array<
      Promise<Emitter.ListenerReturnType<typeof this, EventType, EventMap>>
    > = []

    const proxiedEvent = this.#proxyEvent(event)

    for (const listener of this.#listeners[event.type]) {
      if (
        proxiedEvent.event[kPropagationStopped] != null &&
        proxiedEvent.event[kPropagationStopped] !== this
      ) {
        return []
      }

      if (proxiedEvent.event[kImmediatePropagationStopped]) {
        break
      }

      pendingListeners.push(
        // Awaiting individual listeners guarantees their call order.
        await Promise.resolve(this.#callListener(proxiedEvent.event, listener)),
      )
    }

    proxiedEvent.revoke()

    return Promise.allSettled(pendingListeners).then((results) => {
      return results.map((result) =>
        result.status === 'fulfilled' ? result.value : result.reason,
      )
    })
  }

  /**
   * Emits the given event and returns a generator that yields
   * the result of each listener in the order of their registration.
   * This way, you stop exhausting the listeners once you get the expected value.
   */
  public *emitAsGenerator<EventType extends keyof EventMap & string>(
    event: Brand<EventMap[EventType], EventType>,
  ): Generator<Emitter.ListenerReturnType<typeof this, EventType, EventMap>> {
    if (this.listenerCount(event.type) === 0) {
      return
    }

    const proxiedEvent = this.#proxyEvent(event)

    for (const listener of this.#listeners[event.type]) {
      if (
        proxiedEvent.event[kPropagationStopped] != null &&
        proxiedEvent.event[kPropagationStopped] !== this
      ) {
        return
      }

      if (proxiedEvent.event[kImmediatePropagationStopped]) {
        break
      }

      yield this.#callListener(proxiedEvent.event, listener)
    }

    proxiedEvent.revoke()
  }

  /**
   * Removes a listener for the given event type.
   */
  public removeListener<EventType extends keyof EventMap & string>(
    type: EventType,
    listener: Emitter.ListenerType<typeof this, EventType, EventMap>,
  ): void {
    if (this.listenerCount(type) === 0) {
      return
    }

    const nextListeners: Array<
      Emitter.ListenerType<typeof this, EventType, EventMap>
    > = []

    for (const existingListener of this.#listeners[type]) {
      if (existingListener !== listener) {
        nextListeners.push(existingListener)
      }
    }

    this.#listeners[type] = nextListeners
  }

  /**
   * Removes all listeners for the given event type.
   * If no event type is provided, removes all existing listeners.
   */
  public removeAllListeners<EventType extends keyof EventMap & string>(
    type?: EventType,
  ): void {
    if (type == null) {
      this.#listeners = {} as InternalListenersMap<typeof this>
      return
    }

    this.#listeners[type] = []
  }

  /**
   * Returns the list of listeners for the given event type.
   * If no even type is provided, returns all listeners.
   */
  public listeners<EventType extends keyof EventMap & string>(
    type?: EventType,
  ): Array<Emitter.ListenerType<typeof this, EventType, EventMap>> {
    if (type == null) {
      return Object.values(this.#listeners).flat()
    }

    return this.#listeners[type] || []
  }

  /**
   * Returns the number of listeners for the given event type.
   * If no even type is provided, returns the total number of listeners.
   */
  public listenerCount<EventType extends keyof EventMap & string>(
    type?: EventType,
  ): number {
    return this.listeners(type).length
  }

  #addListener<EventType extends keyof EventMap & string>(
    type: EventType,
    listener: Emitter.ListenerType<typeof this, EventType, EventMap>,
    options: TypedListenerOptions | undefined,
    insertMode: 'append' | 'prepend' = 'append',
  ): typeof this {
    this.#listeners[type] ??= []

    if (insertMode === 'prepend') {
      this.#listeners[type].unshift(listener)
    } else {
      this.#listeners[type].push(listener)
    }

    if (options) {
      Object.defineProperty(listener, kListenerOptions, {
        value: options,
        enumerable: false,
        writable: false,
      })

      if (options.signal) {
        options.signal.addEventListener(
          'abort',
          () => {
            this.removeListener(type, listener)
          },
          { once: true },
        )
      }
    }

    return this
  }

  #proxyEvent<Event extends TypedEvent>(
    event: Event,
  ): { event: Event; revoke: () => void } {
    const { stopPropagation } = event

    event.stopPropagation = new Proxy(event.stopPropagation, {
      apply: (target, thisArg, argArray) => {
        event[kPropagationStopped] = this
        return Reflect.apply(target, thisArg, argArray)
      },
    })

    return {
      event,
      revoke() {
        event.stopPropagation = stopPropagation
      },
    }
  }

  #callListener<EventType extends keyof EventMap & string>(
    event: Event,
    listener: Emitter.ListenerType<typeof this, EventType, EventMap> & {
      [kListenerOptions]?: TypedListenerOptions
    },
  ) {
    const returnValue = listener.call(this, event)

    if (listener[kListenerOptions]?.once) {
      this.removeListener(event.type, listener)
    }

    return returnValue
  }
}
