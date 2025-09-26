type VArgs = [/* value: */ /* value: */ number | string | Date];
type DArgs = [number, number, number?, number?, number?, number?, number?];
type Args = [] | VArgs | DArgs;
/**
 *
 * @param args
 * @returns {Date}
 */
export declare function newDate(...args: Args): Date;
export {};
