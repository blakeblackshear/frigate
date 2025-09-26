type DevMessage = (check: boolean, message: string) => void;
declare let warning: DevMessage;
declare let invariant: DevMessage;

declare function memo<T extends any>(callback: () => T): () => T;

declare const noop: <T>(any: T) => T;

declare const progress: (from: number, to: number, value: number) => number;

/**
 * Converts seconds to milliseconds
 *
 * @param seconds - Time in seconds.
 * @return milliseconds - Converted time in milliseconds.
 */
declare const secondsToMilliseconds: (seconds: number) => number;
declare const millisecondsToSeconds: (milliseconds: number) => number;

export { type DevMessage, invariant, memo, millisecondsToSeconds, noop, progress, secondsToMilliseconds, warning };
