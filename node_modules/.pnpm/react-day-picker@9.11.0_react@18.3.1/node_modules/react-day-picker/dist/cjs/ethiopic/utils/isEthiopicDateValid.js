"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEthiopicDateValid = isEthiopicDateValid;
const daysInMonth_js_1 = require("./daysInMonth.js");
function isEthiopicDateValid(date) {
    if (date.month < 1)
        return false;
    if (date.day < 1)
        return false;
    if (date.month > 13)
        return false;
    if (date.day > (0, daysInMonth_js_1.daysInMonth)(date.month, date.year))
        return false;
    return true;
}
