export declare const dynamicFunction: <F extends (...args: any[]) => any>(implementation: F) => [fn: F, set: (fn: F) => void];
