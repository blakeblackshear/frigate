import { WebSocketData } from '@mswjs/interceptors/WebSocket'
import { truncateMessage } from './truncateMessage'

export async function getPublicData(data: WebSocketData): Promise<string> {
  if (data instanceof Blob) {
    const text = await data.text()
    return `Blob(${truncateMessage(text)})`
  }

  // Handle all ArrayBuffer-like objects.
  if (typeof data === 'object' && 'byteLength' in data) {
    const text = new TextDecoder().decode(data as ArrayBuffer)
    return `ArrayBuffer(${truncateMessage(text)})`
  }

  return truncateMessage(data)
}
