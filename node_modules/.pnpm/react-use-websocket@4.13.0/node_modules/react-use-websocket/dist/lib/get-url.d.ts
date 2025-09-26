import { MutableRefObject } from 'react';
import { Options } from './types';
export declare const getUrl: (url: string | (() => string | Promise<string>), optionsRef: MutableRefObject<Options>, retriedAttempts?: number) => Promise<string | null>;
