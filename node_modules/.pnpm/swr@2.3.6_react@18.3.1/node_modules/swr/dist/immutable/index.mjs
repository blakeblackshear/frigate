import useSWR from '../index/index.mjs';
import { withMiddleware } from '../_internal/index.mjs';

const immutable = (useSWRNext)=>(key, fetcher, config)=>{
        // Always override all revalidate options.
        config.revalidateOnFocus = false;
        config.revalidateIfStale = false;
        config.revalidateOnReconnect = false;
        return useSWRNext(key, fetcher, config);
    };
const useSWRImmutable = withMiddleware(useSWR, immutable);

export { useSWRImmutable as default, immutable };
