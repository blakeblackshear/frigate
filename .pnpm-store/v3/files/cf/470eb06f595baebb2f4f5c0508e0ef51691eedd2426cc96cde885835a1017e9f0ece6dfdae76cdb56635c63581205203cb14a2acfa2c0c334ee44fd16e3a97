export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export declare const LEVELS: Record<LogLevel, number>;
export declare const log: Record<keyof typeof LEVELS, typeof console.log>;
/**
 * Sets a log level
 *
 * @param level - The level to set the logging to. Default is `"fatal"`
 */
export declare const setLogLevel: (level?: keyof typeof LEVELS | number) => void;
