/**
 * A class method decorator that limits a method to be called only once. All
 * subsequent calls will return the result of the first call.
 */
export declare function once<This, Args extends any[], Return>(fn: (this: This, ...args: Args) => Return, context?: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>): (this: This, ...args: Args) => Return;
