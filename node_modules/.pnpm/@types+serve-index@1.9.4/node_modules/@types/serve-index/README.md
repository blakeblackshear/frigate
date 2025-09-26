# Installation
> `npm install --save @types/serve-index`

# Summary
This package contains type definitions for serve-index (https://github.com/expressjs/serve-index).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/serve-index.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/serve-index/index.d.ts)
````ts
import { Handler } from "express";
import { Stats } from "fs";

/** Serves pages that contain directory listings for a given path. */
declare function serveIndex(path: string, options?: serveIndex.Options): Handler;

declare namespace serveIndex {
    interface File {
        name: string;
        stat: Stats;
    }

    interface Locals {
        directory: string;
        displayIcons: boolean;
        fileList: File[];
        name: string;
        stat: Stats;
        path: string;
        style: string;
        viewName: string;
    }

    type TemplateCallback = (error: Error | null, htmlString?: string) => void;

    interface Options {
        filter?: ((filename: string, index: number, files: File[], dir: string) => boolean) | undefined;
        hidden?: boolean | undefined;
        icons?: boolean | undefined;
        stylesheet?: string | undefined;
        template?: string | ((locals: Locals, callback: TemplateCallback) => void) | undefined;
        view?: string | undefined;
    }
}

export = serveIndex;

````

### Additional Details
 * Last updated: Tue, 07 Nov 2023 15:11:36 GMT
 * Dependencies: [@types/express](https://npmjs.com/package/@types/express)

# Credits
These definitions were written by [Tanguy Krotoff](https://github.com/tkrotoff).
