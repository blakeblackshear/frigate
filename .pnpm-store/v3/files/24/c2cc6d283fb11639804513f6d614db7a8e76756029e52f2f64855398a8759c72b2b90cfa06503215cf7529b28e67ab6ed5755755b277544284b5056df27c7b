"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDataUri = void 0;
const toBase64_1 = require("@jsonjoy.com/base64/lib/toBase64");
const toDataUri = (buf, params) => {
    let uri = 'data:application/octet-stream;base64';
    for (const key in params)
        uri += `;${key}=${params[key]}`;
    return uri + ',' + (0, toBase64_1.toBase64)(buf);
};
exports.toDataUri = toDataUri;
//# sourceMappingURL=toDataUri.js.map