import { FetchResponse } from '@mswjs/interceptors'
import type { Emitter } from 'rettime'
import type { SetupWorkerInternalContext } from '../glossary'
import { deserializeRequest } from '../../utils/deserializeRequest'

export function createResponseListener(
  context: SetupWorkerInternalContext,
): Emitter.ListenerType<typeof context.workerChannel, 'RESPONSE'> {
  return (event) => {
    const responseMessage = event.data
    const request = deserializeRequest(responseMessage.request)

    /**
     * CORS requests with `mode: "no-cors"` result in "opaque" responses.
     * That kind of responses cannot be manipulated in JavaScript due
     * to the security considerations.
     * @see https://fetch.spec.whatwg.org/#concept-filtered-response-opaque
     * @see https://github.com/mswjs/msw/issues/529
     */
    if (responseMessage.response.type?.includes('opaque')) {
      return
    }

    const response =
      responseMessage.response.status === 0
        ? Response.error()
        : new FetchResponse(
            /**
             * Responses may be streams here, but when we create a response object
             * with null-body status codes, like 204, 205, 304 Response will
             * throw when passed a non-null body, so ensure it's null here
             * for those codes
             */
            FetchResponse.isResponseWithBody(responseMessage.response.status)
              ? responseMessage.response.body
              : null,
            {
              ...responseMessage,
              /**
               * Set response URL if it's not set already.
               * @see https://github.com/mswjs/msw/issues/2030
               * @see https://developer.mozilla.org/en-US/docs/Web/API/Response/url
               */
              url: request.url,
            },
          )

    context.emitter.emit(
      responseMessage.isMockedResponse ? 'response:mocked' : 'response:bypass',
      {
        requestId: responseMessage.request.id,
        request,
        response,
      },
    )
  }
}
