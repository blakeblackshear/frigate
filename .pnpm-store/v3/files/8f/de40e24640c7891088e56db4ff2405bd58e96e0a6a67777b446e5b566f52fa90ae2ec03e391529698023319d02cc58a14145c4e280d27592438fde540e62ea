import {
  Interceptor,
  BatchInterceptor,
  HttpRequestEventMap,
} from '@mswjs/interceptors'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { SetupWorkerInternalContext, StartOptions } from '../glossary'
import type { RequiredDeep } from '~/core/typeUtils'
import { handleRequest } from '~/core/utils/handleRequest'
import { isHandlerKind } from '~/core/utils/internal/isHandlerKind'

export function createFallbackRequestListener(
  context: SetupWorkerInternalContext,
  options: RequiredDeep<StartOptions>,
): Interceptor<HttpRequestEventMap> {
  const interceptor = new BatchInterceptor({
    name: 'fallback',
    interceptors: [new FetchInterceptor(), new XMLHttpRequestInterceptor()],
  })

  interceptor.on('request', async ({ request, requestId, controller }) => {
    const requestCloneForLogs = request.clone()

    const response = await handleRequest(
      request,
      requestId,
      context.getRequestHandlers().filter(isHandlerKind('RequestHandler')),
      options,
      context.emitter,
      {
        onMockedResponse(_, { handler, parsedResult }) {
          if (!options.quiet) {
            context.emitter.once('response:mocked', ({ response }) => {
              handler.log({
                request: requestCloneForLogs,
                response,
                parsedResult,
              })
            })
          }
        },
      },
    )

    if (response) {
      controller.respondWith(response)
    }
  })

  interceptor.on(
    'response',
    ({ response, isMockedResponse, request, requestId }) => {
      context.emitter.emit(
        isMockedResponse ? 'response:mocked' : 'response:bypass',
        {
          response,
          request,
          requestId,
        },
      )
    },
  )

  interceptor.apply()

  return interceptor
}
