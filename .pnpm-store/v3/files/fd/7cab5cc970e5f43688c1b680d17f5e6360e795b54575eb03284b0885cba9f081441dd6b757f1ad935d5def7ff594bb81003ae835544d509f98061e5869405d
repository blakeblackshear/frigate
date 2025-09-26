import { Emitter } from 'rettime'
import { StartOptions, SetupWorkerInternalContext } from '../glossary'
import { deserializeRequest } from '../../utils/deserializeRequest'
import { RequestHandler } from '~/core/handlers/RequestHandler'
import { handleRequest } from '~/core/utils/handleRequest'
import { RequiredDeep } from '~/core/typeUtils'
import { devUtils } from '~/core/utils/internal/devUtils'
import { toResponseInit } from '~/core/utils/toResponseInit'
import { isHandlerKind } from '~/core/utils/internal/isHandlerKind'

export const createRequestListener = (
  context: SetupWorkerInternalContext,
  options: RequiredDeep<StartOptions>,
): Emitter.ListenerType<typeof context.workerChannel, 'REQUEST'> => {
  return async (event) => {
    // Treat any incoming requests from the worker as passthrough
    // if `worker.stop()` has been called for this client.
    if (
      !context.isMockingEnabled &&
      context.workerStoppedAt &&
      event.data.interceptedAt > context.workerStoppedAt
    ) {
      event.postMessage('PASSTHROUGH')
      return
    }

    const requestId = event.data.id
    const request = deserializeRequest(event.data)
    const requestCloneForLogs = request.clone()

    // Make this the first request clone before the
    // request resolution pipeline even starts.
    // Store the clone in cache so the first matching
    // request handler would skip the cloning phase.
    const requestClone = request.clone()
    RequestHandler.cache.set(request, requestClone)

    try {
      await handleRequest(
        request,
        requestId,
        context.getRequestHandlers().filter(isHandlerKind('RequestHandler')),
        options,
        context.emitter,
        {
          onPassthroughResponse() {
            event.postMessage('PASSTHROUGH')
          },
          async onMockedResponse(response, { handler, parsedResult }) {
            // Clone the mocked response so its body could be read
            // to buffer to be sent to the worker and also in the
            // ".log()" method of the request handler.
            const responseClone = response.clone()
            const responseCloneForLogs = response.clone()
            const responseInit = toResponseInit(response)

            /**
             * @note Safari doesn't support transferring a "ReadableStream".
             * Check that the browser supports that before sending it to the worker.
             */
            if (context.supports.readableStreamTransfer) {
              const responseStreamOrNull = response.body

              event.postMessage(
                'MOCK_RESPONSE',
                {
                  ...responseInit,
                  body: responseStreamOrNull,
                },
                responseStreamOrNull ? [responseStreamOrNull] : undefined,
              )
            } else {
              /**
               * @note If we are here, this means the current environment doesn't
               * support "ReadableStream" as transferable. In that case,
               * attempt to read the non-empty response body as ArrayBuffer, if it's not empty.
               * @see https://github.com/mswjs/msw/issues/1827
               */
              const responseBufferOrNull =
                response.body === null
                  ? null
                  : await responseClone.arrayBuffer()

              event.postMessage('MOCK_RESPONSE', {
                ...responseInit,
                body: responseBufferOrNull,
              })
            }

            if (!options.quiet) {
              context.emitter.once('response:mocked', () => {
                handler.log({
                  request: requestCloneForLogs,
                  response: responseCloneForLogs,
                  parsedResult,
                })
              })
            }
          },
        },
      )
    } catch (error) {
      if (error instanceof Error) {
        devUtils.error(
          `Uncaught exception in the request handler for "%s %s":

%s

This exception has been gracefully handled as a 500 response, however, it's strongly recommended to resolve this error, as it indicates a mistake in your code. If you wish to mock an error response, please see this guide: https://mswjs.io/docs/http/mocking-responses/error-responses`,
          request.method,
          request.url,
          error.stack ?? error,
        )

        // Treat all other exceptions in a request handler as unintended,
        // alerting that there is a problem that needs fixing.
        event.postMessage('MOCK_RESPONSE', {
          status: 500,
          statusText: 'Request Handler Error',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: error.name,
            message: error.message,
            stack: error.stack,
          }),
        })
      }
    }
  }
}
