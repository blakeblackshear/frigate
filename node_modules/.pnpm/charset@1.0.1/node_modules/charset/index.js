'use strict';

const CHARTSET_RE = /(?:charset|encoding)\s{0,10}=\s{0,10}['"]? {0,10}([\w\-]{1,100})/i;

module.exports = charset;

/**
 * guest data charset from req.headers, xml, html content-type meta tag
 * headers:
 *  'content-type': 'text/html;charset=gbk'
 * meta tag:
 *  <meta http-equiv="Content-Type" content="text/html; charset=xxxx"/>
 * xml file:
 *  <?xml version="1.0" encoding="UTF-8"?>
 *
 * @param {Object} obj `Content-Type` String, or `res.headers`, or `res` Object
 * @param {Buffer} [data] content buffer
 * @param {Number} [peekSize] max content peek size, default is 512
 * @return {String} charset, lower case, e.g.: utf8, gbk, gb2312, ....
 *  If can\'t guest, return null
 * @api public
 */
function charset(obj, data, peekSize) {
  let matchs = null;
  let end = 0;
  if (data) {
    peekSize = peekSize || 512;
    // https://github.com/node-modules/charset/issues/4
    end = data.length > peekSize ? peekSize : data.length;
  }
  // charset('text/html;charset=gbk')
  let contentType = obj;
  if (contentType && typeof contentType !== 'string') {
    // charset(res.headers)
    let headers = obj;
    if (obj.headers) {
      // charset(res)
      headers = obj.headers;
    }
    contentType = headers['content-type'] || headers['Content-Type'];
  }
  if (contentType) {
    // guest from obj first
    matchs = CHARTSET_RE.exec(contentType);
  }
  if (!matchs && end > 0) {
    // guest from content body (html/xml) header
    contentType = data.slice(0, end).toString();
    matchs = CHARTSET_RE.exec(contentType);
  }
  let cs = null;
  if (matchs) {
    cs = matchs[1].toLowerCase();
    if (cs === 'utf-8') {
      cs = 'utf8';
    }
  }
  return cs;
}
