"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitStringMatch = void 0;
const emitStringMatch = (expression, offset, match) => {
    const conditions = [];
    for (let i = 0; i < match.length; i++)
        conditions.push(`${match.charCodeAt(i)} === ${expression}.charCodeAt(${offset} + ${i})`);
    return conditions.join(' && ');
};
exports.emitStringMatch = emitStringMatch;
//# sourceMappingURL=helpers.js.map