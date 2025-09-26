"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printJson = void 0;
const printJson = (tab = '', json, space = 2) => (JSON.stringify(json, null, space) || 'nil').split('\n').join('\n' + tab);
exports.printJson = printJson;
