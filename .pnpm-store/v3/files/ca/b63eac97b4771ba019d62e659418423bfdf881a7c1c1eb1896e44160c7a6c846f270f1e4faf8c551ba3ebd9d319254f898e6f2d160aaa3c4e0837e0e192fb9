/**
 * Executes only one instance of give code at a time. For parallel calls, it
 * returns the result of the ongoing execution.
 */
export declare function mutex<This, Args extends any[], Return>(fn: (this: This, ...args: Args) => Promise<Return>, context?: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>): (this: This, ...args: Args) => Promise<Return>;
