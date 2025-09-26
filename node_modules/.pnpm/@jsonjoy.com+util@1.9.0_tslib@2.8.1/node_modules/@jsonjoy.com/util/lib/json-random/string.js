"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomString = void 0;
function randomString(token) {
    if (typeof token === 'string')
        return token;
    const rnd = Math.random();
    switch (token[0]) {
        case 'pick': {
            const set = token[1];
            return set[Math.floor(rnd * set.length)];
        }
        case 'repeat': {
            const min = token[1];
            const max = token[2];
            const pattern = token[3];
            const count = Math.floor(rnd * (max - min + 1)) + min;
            let str = '';
            for (let i = 0; i < count; i++)
                str += randomString(pattern);
            return str;
        }
        case 'range': {
            const min = token[1];
            const max = token[2];
            const codePoint = Math.floor(rnd * (max - min + 1)) + min;
            return String.fromCodePoint(codePoint);
        }
        case 'list':
            return token[1].map(randomString).join('');
        default:
            throw new Error('Invalid token type');
    }
}
exports.randomString = randomString;
//# sourceMappingURL=string.js.map