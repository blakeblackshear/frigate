"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wordWrap = void 0;
const lineMap = (line) => line.slice(-1) === '\n' ? line.slice(0, line.length - 1).replace(/[ \t]*$/gm, '') : line;
const lineReduce = (acc, line) => {
    acc.push(...line.split('\n'));
    return acc;
};
const wordWrap = (str, options = {}) => {
    if (!str)
        return [];
    const width = options.width || 50;
    const regexString = '.{1,' + width + '}([\\s\u200B]+|$)|[^\\s\u200B]+?([\\s\u200B]+|$)';
    const re = new RegExp(regexString, 'g');
    const lines = (str.match(re) || []).map(lineMap).reduce(lineReduce, []);
    return lines;
};
exports.wordWrap = wordWrap;
//# sourceMappingURL=wordWrap.js.map