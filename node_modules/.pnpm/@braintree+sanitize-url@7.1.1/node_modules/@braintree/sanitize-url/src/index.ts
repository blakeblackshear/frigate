import {
  BLANK_URL,
  ctrlCharactersRegex,
  htmlCtrlEntityRegex,
  htmlEntitiesRegex,
  invalidProtocolRegex,
  relativeFirstCharacters,
  whitespaceEscapeCharsRegex,
  urlSchemeRegex,
} from "./constants";

function isRelativeUrlWithoutProtocol(url: string): boolean {
  return relativeFirstCharacters.indexOf(url[0]) > -1;
}

function decodeHtmlCharacters(str: string) {
  const removedNullByte = str.replace(ctrlCharactersRegex, "");
  return removedNullByte.replace(htmlEntitiesRegex, (match, dec) => {
    return String.fromCharCode(dec);
  });
}

function isValidUrl(url: string): boolean {
  return URL.canParse(url);
}

function decodeURI(uri: string): string {
  try {
    return decodeURIComponent(uri);
  } catch (e: unknown) {
    // Ignoring error
    // It is possible that the URI contains a `%` not associated
    // with URI/URL-encoding.
    return uri;
  }
}

export function sanitizeUrl(url?: string): string {
  if (!url) {
    return BLANK_URL;
  }

  let charsToDecode;
  let decodedUrl = decodeURI(url.trim());

  do {
    decodedUrl = decodeHtmlCharacters(decodedUrl)
      .replace(htmlCtrlEntityRegex, "")
      .replace(ctrlCharactersRegex, "")
      .replace(whitespaceEscapeCharsRegex, "")
      .trim();

    decodedUrl = decodeURI(decodedUrl);

    charsToDecode =
      decodedUrl.match(ctrlCharactersRegex) ||
      decodedUrl.match(htmlEntitiesRegex) ||
      decodedUrl.match(htmlCtrlEntityRegex) ||
      decodedUrl.match(whitespaceEscapeCharsRegex);
  } while (charsToDecode && charsToDecode.length > 0);

  const sanitizedUrl = decodedUrl;

  if (!sanitizedUrl) {
    return BLANK_URL;
  }

  if (isRelativeUrlWithoutProtocol(sanitizedUrl)) {
    return sanitizedUrl;
  }

  // Remove any leading whitespace before checking the URL scheme
  const trimmedUrl = sanitizedUrl.trimStart();
  const urlSchemeParseResults = trimmedUrl.match(urlSchemeRegex);

  if (!urlSchemeParseResults) {
    return sanitizedUrl;
  }

  const urlScheme = urlSchemeParseResults[0].toLowerCase().trim();

  if (invalidProtocolRegex.test(urlScheme)) {
    return BLANK_URL;
  }

  const backSanitized = trimmedUrl.replace(/\\/g, "/");

  // Handle special cases for mailto: and custom deep-link protocols
  if (urlScheme === "mailto:" || urlScheme.includes("://")) {
    return backSanitized;
  }

  // For http and https URLs, perform additional validation
  if (urlScheme === "http:" || urlScheme === "https:") {
    if (!isValidUrl(backSanitized)) {
      return BLANK_URL;
    }

    const url = new URL(backSanitized);
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();

    return url.toString();
  }

  return backSanitized;
}
