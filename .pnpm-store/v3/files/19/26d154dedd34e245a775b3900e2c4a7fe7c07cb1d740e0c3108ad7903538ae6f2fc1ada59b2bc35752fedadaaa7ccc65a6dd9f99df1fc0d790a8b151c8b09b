"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixRequestBody = void 0;
const querystring = require("querystring");
/**
 * Fix proxied body if bodyParser is involved.
 */
function fixRequestBody(proxyReq, req) {
    // skip fixRequestBody() when req.readableLength not 0 (bodyParser failure)
    if (req.readableLength !== 0) {
        return;
    }
    const requestBody = req.body;
    if (!requestBody) {
        return;
    }
    const contentType = proxyReq.getHeader('Content-Type');
    if (!contentType) {
        return;
    }
    const writeBody = (bodyData) => {
        // deepcode ignore ContentLengthInCode: bodyParser fix
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
    };
    if (contentType.includes('application/json')) {
        writeBody(JSON.stringify(requestBody));
    }
    else if (contentType.includes('application/x-www-form-urlencoded')) {
        writeBody(querystring.stringify(requestBody));
    }
}
exports.fixRequestBody = fixRequestBody;
