/**
 * A class method decorator that limits the concurrency of the method to the
 * given number of parallel executions. All invocations are queued and executed
 * in the order they were called.
 */
export declare function concurrency<This, Args extends any[], Return>(limit: number): (fn: (this: This, ...args: Args) => Promise<Return>, context?: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>) => (this: This, ...args: Args) => Promise<Return>;
