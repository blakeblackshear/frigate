import { MutableRefObject } from 'react';
import { parseSocketIOUrl, appendQueryParams } from './socket-io';
import { Options } from './types';
import { DEFAULT_RECONNECT_INTERVAL_MS, DEFAULT_RECONNECT_LIMIT } from './constants';

const waitFor = (duration: number) => new Promise(resolve => window.setTimeout(resolve, duration));

export const getUrl = async (
  url: string | (() => string | Promise<string>),
  optionsRef: MutableRefObject<Options>,
  retriedAttempts: number = 0,
): Promise<string | null> => {
  let convertedUrl: string;

  if (typeof url === 'function') {
    try {
      convertedUrl = await url();
    } catch (e) {
      if (
        optionsRef.current.retryOnError
      ) {
        const reconnectLimit = optionsRef.current.reconnectAttempts ?? DEFAULT_RECONNECT_LIMIT;
        if (retriedAttempts < reconnectLimit) {
            const nextReconnectInterval = typeof optionsRef.current.reconnectInterval === 'function' ?
              optionsRef.current.reconnectInterval(retriedAttempts) :
              optionsRef.current.reconnectInterval;
    
            await waitFor(nextReconnectInterval ?? DEFAULT_RECONNECT_INTERVAL_MS);
            return getUrl(url, optionsRef, retriedAttempts + 1);
          } else {
            optionsRef.current.onReconnectStop?.(retriedAttempts);
            return null;
          }
      } else {
        return null;
      }
    }
  } else {
    convertedUrl = url;
  }

  const parsedUrl = optionsRef.current.fromSocketIO ?
    parseSocketIOUrl(convertedUrl) :
    convertedUrl;

  const parsedWithQueryParams = optionsRef.current.queryParams ?
    appendQueryParams(
      parsedUrl,
      optionsRef.current.queryParams
    ) :
    parsedUrl;

  return parsedWithQueryParams;
};
