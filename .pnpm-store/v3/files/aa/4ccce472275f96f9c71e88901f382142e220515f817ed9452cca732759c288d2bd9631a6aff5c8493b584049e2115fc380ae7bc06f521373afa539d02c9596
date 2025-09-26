'use strict';
/* Derived from normalize-url https://github.com/sindresorhus/normalize-url/main/index.js by Sindre Sorhus */

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
const DATA_URL_DEFAULT_MIME_TYPE = 'text/plain';
const DATA_URL_DEFAULT_CHARSET = 'us-ascii';

const supportedProtocols = new Set(['https:', 'http:', 'file:']);

/**
 * @param {string} urlString
 * @return {boolean} */
function hasCustomProtocol(urlString) {
  try {
    const { protocol } = new URL(urlString);
    return protocol.endsWith(':') && !supportedProtocols.has(protocol);
  } catch {
    return false;
  }
}

/**
 * @param {string} urlString
 * @return {string} */
function normalizeDataURL(urlString) {
  const match = /^data:(?<type>[^,]*?),(?<data>[^#]*?)(?:#(?<hash>.*))?$/.exec(
    urlString
  );

  if (!match) {
    throw new Error(`Invalid URL: ${urlString}`);
  }

  let { type, data, hash } =
    /** @type {{type: string, data: string, hash: string}} */ (match.groups);
  const mediaType = type.split(';');

  let isBase64 = false;
  if (mediaType[mediaType.length - 1] === 'base64') {
    mediaType.pop();
    isBase64 = true;
  }

  // Lowercase MIME type
  const mimeType = mediaType.shift()?.toLowerCase() ?? '';
  const attributes = mediaType
    .map(
      /** @type {(string: string) => string} */ (attribute) => {
        let [key, value = ''] = attribute
          .split('=')
          .map(
            /** @type {(string: string) => string} */ (string) => string.trim()
          );

        // Lowercase `charset`
        if (key === 'charset') {
          value = value.toLowerCase();

          if (value === DATA_URL_DEFAULT_CHARSET) {
            return '';
          }
        }

        return `${key}${value ? `=${value}` : ''}`;
      }
    )
    .filter(Boolean);

  const normalizedMediaType = [...attributes];

  if (isBase64) {
    normalizedMediaType.push('base64');
  }

  if (
    normalizedMediaType.length > 0 ||
    (mimeType && mimeType !== DATA_URL_DEFAULT_MIME_TYPE)
  ) {
    normalizedMediaType.unshift(mimeType);
  }

  return `data:${normalizedMediaType.join(';')},${
    isBase64 ? data.trim() : data
  }${hash ? `#${hash}` : ''}`;
}

/**
 * @param {string} urlString
 * @return {string}
 */
function normalizeUrl(urlString) {
  urlString = urlString.trim();

  // Data URL
  if (/^data:/i.test(urlString)) {
    return normalizeDataURL(urlString);
  }

  if (hasCustomProtocol(urlString)) {
    return urlString;
  }

  const hasRelativeProtocol = urlString.startsWith('//');
  const isRelativeUrl = !hasRelativeProtocol && /^\.*\//.test(urlString);

  // Prepend protocol
  if (!isRelativeUrl) {
    urlString = urlString.replace(/^(?!(?:\w+:)?\/\/)|^\/\//, 'http:');
  }

  const urlObject = new URL(urlString);

  // Remove duplicate slashes if not preceded by a protocol
  if (urlObject.pathname) {
    urlObject.pathname = urlObject.pathname.replace(
      /(?<!\b[a-z][a-z\d+\-.]{1,50}:)\/{2,}/g,
      '/'
    );
  }

  // Decode URI octets
  if (urlObject.pathname) {
    try {
      urlObject.pathname = decodeURI(urlObject.pathname);
    } catch {
      /* Do nothing */
    }
  }

  if (urlObject.hostname) {
    // Remove trailing dot
    urlObject.hostname = urlObject.hostname.replace(/\.$/, '');
  }

  urlObject.pathname = urlObject.pathname.replace(/\/$/, '');

  // Take advantage of many of the Node `url` normalizations
  urlString = urlObject.toString();

  // Remove ending `/`
  if (urlObject.pathname === '/' && urlObject.hash === '') {
    urlString = urlString.replace(/\/$/, '');
  }

  // Restore relative protocol
  if (hasRelativeProtocol) {
    urlString = urlString.replace(/^http:\/\//, '//');
  }

  return urlString;
}

module.exports = normalizeUrl;
