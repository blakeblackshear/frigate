import { h as Interceptor, H as HttpRequestEventMap } from '../../Interceptor-bc5a9d8e.js';
import '@open-draft/deferred-promise';
import '@open-draft/logger';
import 'strict-event-emitter';

declare class FetchInterceptor extends Interceptor<HttpRequestEventMap> {
    static symbol: symbol;
    constructor();
    protected checkEnvironment(): boolean;
    protected setup(): Promise<void>;
}

export { FetchInterceptor };
