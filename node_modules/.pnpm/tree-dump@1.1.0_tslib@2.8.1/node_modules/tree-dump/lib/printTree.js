"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printTree = void 0;
const printTree = (tab = '', children) => {
    let str = '';
    let last = children.length - 1;
    for (; last >= 0; last--)
        if (children[last])
            break;
    for (let i = 0; i <= last; i++) {
        const fn = children[i];
        if (!fn)
            continue;
        const isLast = i === last;
        const child = fn(tab + (isLast ? ' ' : '│') + '  ');
        const branch = child ? (isLast ? '└─' : '├─') : '│';
        str += '\n' + tab + branch + (child ? ' ' + child : '');
    }
    return str;
};
exports.printTree = printTree;
