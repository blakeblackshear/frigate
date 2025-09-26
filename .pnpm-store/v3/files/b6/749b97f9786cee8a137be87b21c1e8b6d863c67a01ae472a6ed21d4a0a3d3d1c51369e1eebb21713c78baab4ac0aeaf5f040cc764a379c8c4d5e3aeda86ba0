import { cookieStore } from '../cookieStore.mjs';
import { kSetCookie } from '../HttpResponse/decorators.mjs';
async function storeResponseCookies(request, response) {
  const responseCookies = Reflect.get(response, kSetCookie);
  if (responseCookies) {
    await cookieStore.setCookie(responseCookies, request.url);
  }
}
export {
  storeResponseCookies
};
//# sourceMappingURL=storeResponseCookies.mjs.map