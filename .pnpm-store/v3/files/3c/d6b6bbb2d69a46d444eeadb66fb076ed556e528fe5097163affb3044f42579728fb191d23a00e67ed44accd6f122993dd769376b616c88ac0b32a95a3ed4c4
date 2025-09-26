import type { HandlerKind } from '../../handlers/common'
import type { RequestHandler } from '../../handlers/RequestHandler'
import type { WebSocketHandler } from '../../handlers/WebSocketHandler'

/**
 * A filter function that ensures that the provided argument
 * is a handler of the given kind. This helps differentiate
 * between different kinds of handlers, e.g. request and event handlers.
 */
export function isHandlerKind<K extends HandlerKind>(kind: K) {
  return (
    input: unknown,
  ): input is K extends 'EventHandler' ? WebSocketHandler : RequestHandler => {
    return (
      input != null &&
      typeof input === 'object' &&
      '__kind' in input &&
      input.__kind === kind
    )
  }
}
