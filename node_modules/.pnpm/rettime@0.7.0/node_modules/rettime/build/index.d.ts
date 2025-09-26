type DefaultEventMap = {
    [eventType: string]: TypedEvent<any, any>;
};
declare const kDefaultPrevented: unique symbol;
declare const kPropagationStopped: unique symbol;
declare const kImmediatePropagationStopped: unique symbol;
interface TypedEvent<DataType = void, ReturnType = any, EventType extends string = string> extends Omit<MessageEvent<DataType>, 'type'> {
    type: EventType;
}
declare class TypedEvent<DataType = void, ReturnType = any, EventType extends string = string> extends MessageEvent<DataType> implements TypedEvent<DataType, ReturnType, EventType> {
    #private;
    [kDefaultPrevented]: boolean;
    [kPropagationStopped]?: Emitter<any>;
    [kImmediatePropagationStopped]?: boolean;
    constructor(...args: [DataType] extends [void] ? [type: EventType] : [type: EventType, init: {
        data: DataType;
    }]);
    get defaultPrevented(): boolean;
    preventDefault(): void;
    stopImmediatePropagation(): void;
}
/**
 * Brands a TypedEvent or its subclass while preserving its (narrower) type.
 */
type Brand<Event extends TypedEvent, EventType extends string> = Event & {
    type: EventType;
};
type InferEventMap<Target extends Emitter<any>> = Target extends Emitter<infer EventMap> ? EventMap : never;
type TypedListenerOptions = {
    once?: boolean;
    signal?: AbortSignal;
};
declare namespace Emitter {
    /**
     * Returns an appropriate `Event` type for the given event type.
     *
     * @example
     * const emitter = new Emitter<{ greeting: TypedEvent<string> }>()
     * type GreetingEvent = Emitter.InferEventType<typeof emitter, 'greeting'>
     * // TypedEvent<string>
     */
    type EventType<Target extends Emitter<any>, EventType extends keyof EventMap & string, EventMap extends DefaultEventMap = InferEventMap<Target>> = Brand<EventMap[EventType], EventType>;
    type EventDataType<Target extends Emitter<any>, EventType extends keyof EventMap & string, EventMap extends DefaultEventMap = InferEventMap<Target>> = EventMap[EventType] extends TypedEvent<infer DataType> ? DataType : never;
    /**
     * Returns the listener type for the given event type.
     *
     * @example
     * const emitter = new Emitter<{ getTotalPrice: TypedEvent<Cart, number> }>()
     * type Listener = Emitter.ListenerType<typeof emitter, 'getTotalPrice'>
     * // (event: TypedEvent<Cart>) => number
     */
    type ListenerType<Target extends Emitter<any>, Type extends keyof EventMap & string, EventMap extends DefaultEventMap = InferEventMap<Target>> = (event: Emitter.EventType<Target, Type, EventMap>) => Emitter.ListenerReturnType<Target, Type, EventMap> extends [void] ? void : Emitter.ListenerReturnType<Target, Type, EventMap>;
    /**
     * Returns the return type of the listener for the given event type.
     *
     * @example
     * const emitter = new Emitter<{ getTotalPrice: TypedEvent<Cart, number> }>()
     * type ListenerReturnType = Emitter.InferListenerReturnType<typeof emitter, 'getTotalPrice'>
     * // number
     */
    type ListenerReturnType<Target extends Emitter<any>, EventType extends keyof EventMap & string, EventMap extends DefaultEventMap = InferEventMap<Target>> = EventMap[EventType] extends TypedEvent<unknown, infer ReturnType> ? ReturnType : never;
}
declare class Emitter<EventMap extends DefaultEventMap> {
    #private;
    constructor();
    /**
     * Adds a listener for the given event type.
     *
     * @returns {AbortController} An `AbortController` that can be used to remove the listener.
     */
    on<EventType extends keyof EventMap & string>(type: EventType, listener: Emitter.ListenerType<typeof this, EventType, EventMap>, options?: TypedListenerOptions): typeof this;
    /**
     * Adds a one-time listener for the given event type.
     *
     * @returns {AbortController} An `AbortController` that can be used to remove the listener.
     */
    once<EventType extends keyof EventMap & string>(type: EventType, listener: Emitter.ListenerType<typeof this, EventType, EventMap>, options?: Omit<TypedListenerOptions, 'once'>): typeof this;
    /**
     * Prepends a listener for the given event type.
     *
     * @returns {AbortController} An `AbortController` that can be used to remove the listener.
     */
    earlyOn<EventType extends keyof EventMap & string>(type: EventType, listener: Emitter.ListenerType<typeof this, EventType, EventMap>, options?: TypedListenerOptions): typeof this;
    /**
     * Prepends a one-time listener for the given event type.
     */
    earlyOnce<EventType extends keyof EventMap & string>(type: EventType, listener: Emitter.ListenerType<typeof this, EventType, EventMap>, options?: Omit<TypedListenerOptions, 'once'>): typeof this;
    /**
     * Emits the given typed event.
     *
     * @returns {boolean} Returns `true` if the event had any listeners, `false` otherwise.
     */
    emit<EventType extends keyof EventMap & string>(event: Brand<EventMap[EventType], EventType>): boolean;
    /**
     * Emits the given typed event and returns a promise that resolves
     * when all the listeners for that event have settled.
     *
     * @returns {Promise<Array<Emitter.ListenerReturnType>>} A promise that resolves
     * with the return values of all listeners.
     */
    emitAsPromise<EventType extends keyof EventMap & string>(event: Brand<EventMap[EventType], EventType>): Promise<Array<Emitter.ListenerReturnType<typeof this, EventType, EventMap>>>;
    /**
     * Emits the given event and returns a generator that yields
     * the result of each listener in the order of their registration.
     * This way, you stop exhausting the listeners once you get the expected value.
     */
    emitAsGenerator<EventType extends keyof EventMap & string>(event: Brand<EventMap[EventType], EventType>): Generator<Emitter.ListenerReturnType<typeof this, EventType, EventMap>>;
    /**
     * Removes a listener for the given event type.
     */
    removeListener<EventType extends keyof EventMap & string>(type: EventType, listener: Emitter.ListenerType<typeof this, EventType, EventMap>): void;
    /**
     * Removes all listeners for the given event type.
     * If no event type is provided, removes all existing listeners.
     */
    removeAllListeners<EventType extends keyof EventMap & string>(type?: EventType): void;
    /**
     * Returns the list of listeners for the given event type.
     * If no even type is provided, returns all listeners.
     */
    listeners<EventType extends keyof EventMap & string>(type?: EventType): Array<Emitter.ListenerType<typeof this, EventType, EventMap>>;
    /**
     * Returns the number of listeners for the given event type.
     * If no even type is provided, returns the total number of listeners.
     */
    listenerCount<EventType extends keyof EventMap & string>(type?: EventType): number;
}

export { type DefaultEventMap, Emitter, TypedEvent, type TypedListenerOptions };
