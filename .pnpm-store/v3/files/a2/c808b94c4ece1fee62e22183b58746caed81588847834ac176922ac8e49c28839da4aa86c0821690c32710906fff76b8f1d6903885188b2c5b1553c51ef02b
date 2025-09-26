import type { WebSocketData } from '@mswjs/interceptors/lib/browser/interceptors/WebSocket'

/**
 * Returns the byte length of the given WebSocket message.
 * @example
 * getMessageLength('hello') // 5
 * getMessageLength(new Blob(['hello'])) // 5
 */
export function getMessageLength(data: WebSocketData): number {
  if (data instanceof Blob) {
    return data.size
  }

  if (data instanceof ArrayBuffer) {
    return data.byteLength
  }

  return new Blob([data as any]).size
}
