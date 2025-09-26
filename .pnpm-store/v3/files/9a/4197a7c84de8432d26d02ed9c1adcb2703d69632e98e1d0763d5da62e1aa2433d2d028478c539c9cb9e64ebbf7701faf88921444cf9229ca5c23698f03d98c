import { H as HttpResponseInit } from '../../HttpResponse-B4YmE-GJ.mjs';
import '@mswjs/interceptors';
import '../internal/isIterable.mjs';
import '../../typeUtils.mjs';
import 'graphql';
import '../matching/matchRequestUrl.mjs';

declare const kSetCookie: unique symbol;
interface HttpResponseDecoratedInit extends HttpResponseInit {
    status: number;
    statusText: string;
    headers: Headers;
}
declare function normalizeResponseInit(init?: HttpResponseInit): HttpResponseDecoratedInit;
declare function decorateResponse(response: Response, init: HttpResponseDecoratedInit): Response;

export { type HttpResponseDecoratedInit, decorateResponse, kSetCookie, normalizeResponseInit };
