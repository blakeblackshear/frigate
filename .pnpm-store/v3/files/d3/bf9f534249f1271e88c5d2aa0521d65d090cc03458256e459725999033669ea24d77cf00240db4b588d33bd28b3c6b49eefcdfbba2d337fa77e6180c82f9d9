"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addYears = addYears;
const dateConversion_js_1 = require("../utils/dateConversion.js");
const setYear_js_1 = require("./setYear.js");
function addYears(date, amount) {
    if (amount === 0) {
        return new Date(date.getTime());
    }
    const hebrew = (0, dateConversion_js_1.toHebrewDate)(date);
    return (0, setYear_js_1.setYear)(date, hebrew.year + amount);
}
