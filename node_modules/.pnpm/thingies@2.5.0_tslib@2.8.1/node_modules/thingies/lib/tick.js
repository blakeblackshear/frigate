"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tick = void 0;
const tick = (ms = 1) => new Promise((r) => setTimeout(r, ms));
exports.tick = tick;
