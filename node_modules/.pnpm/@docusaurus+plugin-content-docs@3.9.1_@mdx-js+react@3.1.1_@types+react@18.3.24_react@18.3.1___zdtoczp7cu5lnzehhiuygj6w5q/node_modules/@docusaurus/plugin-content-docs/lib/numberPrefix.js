"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisabledNumberPrefixParser = exports.DefaultNumberPrefixParser = void 0;
exports.stripNumberPrefix = stripNumberPrefix;
exports.stripPathNumberPrefixes = stripPathNumberPrefixes;
// Best-effort to avoid parsing some patterns as number prefix
// ignore common date-like patterns: https://github.com/facebook/docusaurus/issues/4640
// ignore common versioning patterns: https://github.com/facebook/docusaurus/issues/4653
// Both of them would look like 7.0-foo or 2021-11-foo
// note: we could try to parse float numbers in filenames, but that is probably
// not worth it, as a version such as "8.0" can be interpreted as either a
// version or a float. User can configure her own NumberPrefixParser if she
// wants 8.0 to be interpreted as a float
const ignoredPrefixPattern = /^\d+[-_.]\d+/;
const numberPrefixPattern = /^(?<numberPrefix>\d+)\s*[-_.]+\s*(?<suffix>[^-_.\s].*)$/;
// 0-myDoc => {filename: myDoc, numberPrefix: 0}
// 003 - myDoc => {filename: myDoc, numberPrefix: 3}
const DefaultNumberPrefixParser = (filename) => {
    if (ignoredPrefixPattern.test(filename)) {
        return { filename, numberPrefix: undefined };
    }
    const match = numberPrefixPattern.exec(filename);
    if (!match) {
        return { filename, numberPrefix: undefined };
    }
    return {
        filename: match.groups.suffix,
        numberPrefix: parseInt(match.groups.numberPrefix, 10),
    };
};
exports.DefaultNumberPrefixParser = DefaultNumberPrefixParser;
const DisabledNumberPrefixParser = (filename) => ({ filename, numberPrefix: undefined });
exports.DisabledNumberPrefixParser = DisabledNumberPrefixParser;
// 0-myDoc => myDoc
function stripNumberPrefix(str, parser) {
    return parser(str).filename;
}
// 0-myFolder/0-mySubfolder/0-myDoc => myFolder/mySubfolder/myDoc
function stripPathNumberPrefixes(path, parser) {
    return path
        .split('/')
        .map((segment) => stripNumberPrefix(segment, parser))
        .join('/');
}
