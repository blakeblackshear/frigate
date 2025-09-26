export = memorize;
/**
 * @template T
 * @typedef {(...args: any) => T} FunctionReturning
 */
/**
 * @template T
 * @param {FunctionReturning<T>} fn memorized function
 * @param {({ cache?: Map<string, { data: T }> } | undefined)=} cache cache
 * @param {((value: T) => T)=} callback callback
 * @returns {FunctionReturning<T>} new function
 */
declare function memorize<T>(
  fn: FunctionReturning<T>,
  {
    cache,
  }?:
    | (
        | {
            cache?: Map<
              string,
              {
                data: T;
              }
            >;
          }
        | undefined
      )
    | undefined,
  callback?: ((value: T) => T) | undefined,
): FunctionReturning<T>;
declare namespace memorize {
  export { FunctionReturning };
}
type FunctionReturning<T> = (...args: any) => T;
