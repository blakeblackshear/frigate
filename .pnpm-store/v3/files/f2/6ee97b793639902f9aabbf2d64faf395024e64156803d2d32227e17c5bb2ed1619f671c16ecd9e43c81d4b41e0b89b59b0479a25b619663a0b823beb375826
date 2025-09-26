/**
 * Returns a boolean indicating whether the current browser
 * supports `ReadableStream` as a `Transferable` when posting
 * messages.
 */
export function supportsReadableStreamTransfer() {
  try {
    const stream = new ReadableStream({
      start: (controller) => controller.close(),
    })
    const message = new MessageChannel()
    message.port1.postMessage(stream, [stream])
    return true
  } catch {
    return false
  }
}
