export declare type Id<T> = {
    [K in keyof T]: T[K];
} & {};
export declare type WithRequiredProp<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export declare type Override<T1, T2> = T2 extends any ? Omit<T1, keyof T2> & T2 : never;
export declare function assertCast<T>(v: any): asserts v is T;
export declare function safeAssign<T extends object>(target: T, ...args: Array<Partial<NoInfer<T>>>): void;
/**
 * Convert a Union type `(A|B)` to an intersection type `(A&B)`
 */
export declare type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
export declare type NonOptionalKeys<T> = {
    [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];
export declare type HasRequiredProps<T, True, False> = NonOptionalKeys<T> extends never ? False : True;
export declare type OptionalIfAllPropsOptional<T> = HasRequiredProps<T, T, T | never>;
export declare type NoInfer<T> = [T][T extends any ? 0 : never];
export declare type NonUndefined<T> = T extends undefined ? never : T;
export declare type UnwrapPromise<T> = T extends PromiseLike<infer V> ? V : T;
export declare type MaybePromise<T> = T | PromiseLike<T>;
export declare type OmitFromUnion<T, K extends keyof T> = T extends any ? Omit<T, K> : never;
export declare type IsAny<T, True, False = never> = true | false extends (T extends never ? true : false) ? True : False;
export declare type CastAny<T, CastTo> = IsAny<T, CastTo, T>;
