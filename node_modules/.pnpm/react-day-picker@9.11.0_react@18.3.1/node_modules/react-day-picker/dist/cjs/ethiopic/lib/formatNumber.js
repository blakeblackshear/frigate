"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatNumber = formatNumber;
const toGeezNumerals_js_1 = require("../utils/toGeezNumerals.js");
/**
 * Formats a number using either Latin or Ethiopic (Geez) numerals
 *
 * @example
 *   ```ts
 *   formatNumber(123) // '123'
 *   formatNumber(123, 'geez') // '፻፳፫'
 *   formatNumber(2023, 'geez') // '፳፻፳፫'
 *   ```;
 *
 * @param value - The number to format
 * @param numerals - The numeral system to use:
 *
 *   - 'latn': Latin numerals (1, 2, 3...)
 *   - 'geez': Ethiopic numerals (፩, ፪, ፫...)
 *
 * @returns The formatted number string
 */
function formatNumber(value, numerals = "latn") {
    if (numerals === "geez") {
        return (0, toGeezNumerals_js_1.toGeezNumerals)(value);
    }
    // Use Intl.NumberFormat for other numeral systems
    const formatter = new Intl.NumberFormat("en-US", {
        numberingSystem: numerals,
    });
    return formatter.format(value);
}
