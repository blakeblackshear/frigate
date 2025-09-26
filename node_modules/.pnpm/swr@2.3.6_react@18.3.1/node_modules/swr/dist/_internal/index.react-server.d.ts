import { Key, Arguments } from './types.js';
export { SWRConfig } from './index.js';
export { INFINITE_PREFIX } from './constants.js';

declare const serialize: (key: Key) => [string, Arguments];

export { serialize };
