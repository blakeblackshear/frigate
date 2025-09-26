import { RequestHandler } from '../../handlers/RequestHandler'

export function use(
  currentHandlers: Array<RequestHandler>,
  ...handlers: Array<RequestHandler>
): void {
  currentHandlers.unshift(...handlers)
}

export function restoreHandlers(handlers: Array<RequestHandler>): void {
  handlers.forEach((handler) => {
    handler.isUsed = false
  })
}

export function resetHandlers(
  initialHandlers: Array<RequestHandler>,
  ...nextHandlers: Array<RequestHandler>
) {
  return nextHandlers.length > 0 ? [...nextHandlers] : [...initialHandlers]
}
