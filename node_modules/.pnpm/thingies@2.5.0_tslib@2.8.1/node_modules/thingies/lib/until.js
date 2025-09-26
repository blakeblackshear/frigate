"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.until = void 0;
const tick_1 = require("./tick");
const until = async (check, pollInterval = 1) => {
    do {
        if (await check())
            return;
        await (0, tick_1.tick)(pollInterval);
    } while (true);
};
exports.until = until;
