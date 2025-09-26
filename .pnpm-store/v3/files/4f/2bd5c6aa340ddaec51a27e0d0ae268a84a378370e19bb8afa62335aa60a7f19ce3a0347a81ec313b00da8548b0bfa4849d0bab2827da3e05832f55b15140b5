'use strict';

var node_module = require('node:module');
var fs = require('node:fs');
var path = require('node:path');

const import_meta = {};
const CWD = process.cwd();
const importMetaUrl = import_meta.url;
const cjsRequire = importMetaUrl ? node_module.createRequire(importMetaUrl) : require;
const EVAL_FILENAMES = /* @__PURE__ */ new Set(["[eval]", "[worker eval]"]);
const EXTENSIONS = [".ts", ".tsx", ...Object.keys(cjsRequire.extensions)];

const tryPkg = (pkg) => {
  try {
    return cjsRequire.resolve(pkg);
  } catch (e) {
  }
};
const isPkgAvailable = (pkg) => !!tryPkg(pkg);
const tryFile = (filename, includeDir = false, base = CWD) => {
  if (typeof filename === "string") {
    const filepath = path.resolve(base, filename);
    return fs.existsSync(filepath) && (includeDir || fs.statSync(filepath).isFile()) ? filepath : "";
  }
  for (const file of filename != null ? filename : []) {
    const filepath = tryFile(file, includeDir, base);
    if (filepath) {
      return filepath;
    }
  }
  return "";
};
const tryExtensions = (filepath, extensions = EXTENSIONS) => {
  const ext = [...extensions, ""].find((ext2) => tryFile(filepath + ext2));
  return ext == null ? "" : filepath + ext;
};
const findUp = (searchEntry, searchFileOrIncludeDir, includeDir) => {
  const isSearchFile = typeof searchFileOrIncludeDir === "string";
  const searchFile = isSearchFile ? searchFileOrIncludeDir : "package.json";
  let lastSearchEntry;
  do {
    const searched = tryFile(
      searchFile,
      isSearchFile && includeDir,
      searchEntry
    );
    if (searched) {
      return searched;
    }
    lastSearchEntry = searchEntry;
    searchEntry = path.dirname(searchEntry);
  } while (!lastSearchEntry || lastSearchEntry !== searchEntry);
  return "";
};

exports.CWD = CWD;
exports.EVAL_FILENAMES = EVAL_FILENAMES;
exports.EXTENSIONS = EXTENSIONS;
exports.cjsRequire = cjsRequire;
exports.findUp = findUp;
exports.isPkgAvailable = isPkgAvailable;
exports.tryExtensions = tryExtensions;
exports.tryFile = tryFile;
exports.tryPkg = tryPkg;
