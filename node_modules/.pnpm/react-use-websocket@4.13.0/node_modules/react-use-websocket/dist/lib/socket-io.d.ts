import { QueryParams, SendMessage } from './types';
export declare const parseSocketIOUrl: (url: string) => string;
export declare const appendQueryParams: (url: string, params?: QueryParams) => string;
export declare const setUpSocketIOPing: (sendMessage: SendMessage, interval?: number) => number;
