/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { URI, Utils } from 'vscode-uri';
export { URI };
export declare namespace UriUtils {
    const basename: typeof Utils.basename;
    const dirname: typeof Utils.dirname;
    const extname: typeof Utils.extname;
    const joinPath: typeof Utils.joinPath;
    const resolvePath: typeof Utils.resolvePath;
    function equals(a?: URI | string, b?: URI | string): boolean;
    function relative(from: URI | string, to: URI | string): string;
    function normalize(uri: URI | string): string;
}
//# sourceMappingURL=uri-utils.d.ts.map