Object.defineProperty(exports, '__esModule', { value: true });

var useSWR = require('../index/index.js');
var index_js = require('../_internal/index.js');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var useSWR__default = /*#__PURE__*/_interopDefault(useSWR);

const immutable = (useSWRNext)=>(key, fetcher, config)=>{
        // Always override all revalidate options.
        config.revalidateOnFocus = false;
        config.revalidateIfStale = false;
        config.revalidateOnReconnect = false;
        return useSWRNext(key, fetcher, config);
    };
const useSWRImmutable = index_js.withMiddleware(useSWR__default.default, immutable);

exports.default = useSWRImmutable;
exports.immutable = immutable;
