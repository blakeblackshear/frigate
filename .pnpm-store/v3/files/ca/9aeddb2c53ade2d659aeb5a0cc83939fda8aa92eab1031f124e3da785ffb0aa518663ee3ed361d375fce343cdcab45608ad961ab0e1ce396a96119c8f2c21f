/**
 * TimedState works similar to TimedQueue, but instead of saving
 * a list of all items pushed, it reduces the state on each push.
 */
export declare class TimedState<S, I> {
    protected readonly initState: () => S;
    protected readonly reducer: (state: S, item: I) => S;
    /**
     * State will be flushed when it reaches this number of items.
     */
    itemLimit: number;
    /**
     * State will be flushed after this many milliseconds.
     */
    timeLimit: number;
    /**
     * Method that will be called when state is flushed.
     */
    onFlush: (state: S) => void;
    constructor(initState: () => S, reducer: (state: S, item: I) => S);
    protected length: number;
    protected state: S;
    private timer;
    push(item: I): void;
    flush(): S;
}
