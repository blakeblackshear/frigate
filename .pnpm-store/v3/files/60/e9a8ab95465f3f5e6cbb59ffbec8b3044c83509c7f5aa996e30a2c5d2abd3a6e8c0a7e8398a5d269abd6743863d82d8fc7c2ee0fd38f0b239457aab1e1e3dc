const REDUNDANT_CHARACTERS_EXP = /[?|#].*$/g;
function getSearchParams(path) {
  return new URL(`/${path}`, "http://localhost").searchParams;
}
function cleanUrl(path) {
  if (path.endsWith("?")) {
    return path;
  }
  return path.replace(REDUNDANT_CHARACTERS_EXP, "");
}
export {
  cleanUrl,
  getSearchParams
};
//# sourceMappingURL=cleanUrl.mjs.map