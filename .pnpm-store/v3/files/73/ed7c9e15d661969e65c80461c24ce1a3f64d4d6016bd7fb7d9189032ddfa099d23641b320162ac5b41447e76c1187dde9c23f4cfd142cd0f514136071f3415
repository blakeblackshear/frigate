"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.element = exports.ctag = exports.otag = exports.text = void 0;
const invalidXMLUnicodeRegex = 
// eslint-disable-next-line no-control-regex
/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u0084\u0086-\u009F\uD800-\uDFFF\uFDD0-\uFDDF\u{1FFFE}-\u{1FFFF}\u{2FFFE}-\u{2FFFF}\u{3FFFE}-\u{3FFFF}\u{4FFFE}-\u{4FFFF}\u{5FFFE}-\u{5FFFF}\u{6FFFE}-\u{6FFFF}\u{7FFFE}-\u{7FFFF}\u{8FFFE}-\u{8FFFF}\u{9FFFE}-\u{9FFFF}\u{AFFFE}-\u{AFFFF}\u{BFFFE}-\u{BFFFF}\u{CFFFE}-\u{CFFFF}\u{DFFFE}-\u{DFFFF}\u{EFFFE}-\u{EFFFF}\u{FFFFE}-\u{FFFFF}\u{10FFFE}-\u{10FFFF}]/gu;
const amp = /&/g;
const lt = /</g;
const apos = /'/g;
const quot = /"/g;
function text(txt) {
    return txt
        .replace(amp, '&amp;')
        .replace(lt, '&lt;')
        .replace(invalidXMLUnicodeRegex, '');
}
exports.text = text;
function otag(nodeName, attrs, selfClose = false) {
    let attrstr = '';
    for (const k in attrs) {
        const val = attrs[k]
            .replace(amp, '&amp;')
            .replace(lt, '&lt;')
            .replace(apos, '&apos;')
            .replace(quot, '&quot;')
            .replace(invalidXMLUnicodeRegex, '');
        attrstr += ` ${k}="${val}"`;
    }
    return `<${nodeName}${attrstr}${selfClose ? '/' : ''}>`;
}
exports.otag = otag;
function ctag(nodeName) {
    return `</${nodeName}>`;
}
exports.ctag = ctag;
function element(nodeName, attrs, innerText) {
    if (typeof attrs === 'string') {
        return otag(nodeName) + text(attrs) + ctag(nodeName);
    }
    else if (innerText) {
        return otag(nodeName, attrs) + text(innerText) + ctag(nodeName);
    }
    else {
        return otag(nodeName, attrs, true);
    }
}
exports.element = element;
