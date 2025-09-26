declare type UnwrapPromise<P extends unknown> = P extends PromiseLike<infer V> ? V : P;
declare type Input = Record<string | number | symbol, unknown>;
declare type Result<Obj extends Input> = {
    [P in keyof Obj]: UnwrapPromise<Obj[P]>;
};
export default function combinePromises<Obj extends Input>(obj: Obj): Promise<Result<Obj>>;
export {};
