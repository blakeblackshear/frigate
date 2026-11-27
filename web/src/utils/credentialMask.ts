// Mirrors clean_camera_user_pass and REGEX_MASKED_CREDENTIAL in the backend.
const CREDENTIAL_QUERY_KEYS =
  "(?:user(?:name)?|usr|login|pass(?:word|wd)?|pwd|(?:[a-z_]*_)?token|(?:[a-z_]*_)?secret|client_private|api_?key)";
const URL_USERINFO_PATTERN =
  /:\/\/((?:[^\s/?#:[\]]*:(?:(?!:\/\/)\S)*|[^\s/?#]+))@((?:(?!:\/\/)\S)*)/g;
const CREDENTIAL_QUERY_KEY_PATTERN = new RegExp(
  `[?&]${CREDENTIAL_QUERY_KEYS}=`,
  "i",
);
const CREDENTIAL_QUERY_PATTERN = new RegExp(
  `([?&]${CREDENTIAL_QUERY_KEYS}=)[^&\\s]*`,
  "gi",
);
const MASKED_PATTERN = new RegExp(
  `://\\*:\\*@|[?&]${CREDENTIAL_QUERY_KEYS}=\\*(?![^&\\s])`,
  "i",
);

export const isMaskedPath = (value: string): boolean =>
  MASKED_PATTERN.test(value);

export const maskCredentials = (value: string): string => {
  if (!value) {
    return value;
  }

  return value
    .replace(URL_USERINFO_PATTERN, (_match, userinfo: string, rest: string) =>
      CREDENTIAL_QUERY_KEY_PATTERN.test(userinfo)
        ? "://*:*@"
        : `://*:*@${rest}`,
    )
    .replace(CREDENTIAL_QUERY_PATTERN, "$1*");
};

export const hasCredentials = (value: string): boolean =>
  !!value && (isMaskedPath(value) || maskCredentials(value) !== value);
