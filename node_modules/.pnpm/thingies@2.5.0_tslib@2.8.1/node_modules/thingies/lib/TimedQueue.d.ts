/**
 * Queue that is flushed automatically when it reaches some item limit
 * or when timeout is reached.
 */
export declare class TimedQueue<T> {
    /**
     * Queue will be flushed when it reaches this number of items.
     */
    itemLimit: number;
    /**
     * Queue will be flushed after this many milliseconds.
     */
    timeLimit: number;
    /**
     * Method that will be called when queue is flushed.
     */
    onFlush: (list: T[]) => void;
    private list;
    private timer;
    push(item: T): void;
    flush(): T[];
}
