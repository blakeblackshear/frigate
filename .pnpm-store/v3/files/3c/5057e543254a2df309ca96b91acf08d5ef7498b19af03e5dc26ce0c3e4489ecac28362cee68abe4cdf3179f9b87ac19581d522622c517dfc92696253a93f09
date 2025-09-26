# Installation
> `npm install --save @types/connect-history-api-fallback`

# Summary
This package contains type definitions for connect-history-api-fallback (https://github.com/bripkens/connect-history-api-fallback#readme).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/connect-history-api-fallback.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/connect-history-api-fallback/index.d.ts)
````ts
/// <reference types="node" />

import { Url } from "url";

import * as core from "express-serve-static-core";

export = historyApiFallback;

declare function historyApiFallback(options?: historyApiFallback.Options): core.RequestHandler;

declare namespace historyApiFallback {
    interface Options {
        readonly disableDotRule?: true | undefined;
        readonly htmlAcceptHeaders?: readonly string[] | undefined;
        readonly index?: string | undefined;
        readonly logger?: typeof console.log | undefined;
        readonly rewrites?: readonly Rewrite[] | undefined;
        readonly verbose?: boolean | undefined;
    }

    interface Context {
        readonly match: RegExpMatchArray;
        readonly parsedUrl: Url;
        readonly request: core.Request;
    }
    type RewriteTo = (context: Context) => string;

    interface Rewrite {
        readonly from: RegExp;
        readonly to: string | RegExp | RewriteTo;
    }
}

````

### Additional Details
 * Last updated: Mon, 20 Nov 2023 23:36:24 GMT
 * Dependencies: [@types/express-serve-static-core](https://npmjs.com/package/@types/express-serve-static-core), [@types/node](https://npmjs.com/package/@types/node)

# Credits
These definitions were written by [Douglas Duteil](https://github.com/douglasduteil).
