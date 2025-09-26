/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import { URI, Utils } from 'vscode-uri';
export { URI };
export var UriUtils;
(function (UriUtils) {
    UriUtils.basename = Utils.basename;
    UriUtils.dirname = Utils.dirname;
    UriUtils.extname = Utils.extname;
    UriUtils.joinPath = Utils.joinPath;
    UriUtils.resolvePath = Utils.resolvePath;
    function equals(a, b) {
        return (a === null || a === void 0 ? void 0 : a.toString()) === (b === null || b === void 0 ? void 0 : b.toString());
    }
    UriUtils.equals = equals;
    function relative(from, to) {
        const fromPath = typeof from === 'string' ? from : from.path;
        const toPath = typeof to === 'string' ? to : to.path;
        const fromParts = fromPath.split('/').filter(e => e.length > 0);
        const toParts = toPath.split('/').filter(e => e.length > 0);
        let i = 0;
        for (; i < fromParts.length; i++) {
            if (fromParts[i] !== toParts[i]) {
                break;
            }
        }
        const backPart = '../'.repeat(fromParts.length - i);
        const toPart = toParts.slice(i).join('/');
        return backPart + toPart;
    }
    UriUtils.relative = relative;
    function normalize(uri) {
        return URI.parse(uri.toString()).toString();
    }
    UriUtils.normalize = normalize;
})(UriUtils || (UriUtils = {}));
//# sourceMappingURL=uri-utils.js.map