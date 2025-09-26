import { cookieStore } from '../cookieStore'
import { kSetCookie } from '../HttpResponse/decorators'

export async function storeResponseCookies(
  request: Request,
  response: Response,
): Promise<void> {
  // Grab the raw "Set-Cookie" response header provided
  // in the HeadersInit for this mocked response.
  const responseCookies = Reflect.get(response, kSetCookie) as
    | string
    | undefined

  if (responseCookies) {
    await cookieStore.setCookie(responseCookies, request.url)
  }
}
