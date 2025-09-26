/**
 * Converts a number to Geez (Ethiopic) numerals.
 *
 * @param num - The number to convert
 * @returns The number in Geez numerals
 * @throws {Error} When input is 0 (Geez has no zero representation)
 */
export function toGeezNumerals(num) {
    const geezDigits = ["፩", "፪", "፫", "፬", "፭", "፮", "፯", "፰", "፱"];
    const geezTens = ["፲", "፳", "፴", "፵", "፶", "፷", "፸", "፹", "፺"];
    const geezHundreds = "፻";
    const geezThousands = "፼";
    if (num === 0)
        return "-";
    if (num < 0)
        return `-${toGeezNumerals(-num)}`;
    let result = "";
    let remaining = num;
    // Handle thousands (10,000 and above)
    if (remaining >= 10000) {
        const thousandsValue = Math.floor(remaining / 10000);
        result +=
            thousandsValue === 1
                ? geezThousands
                : toGeezNumerals(thousandsValue) + geezThousands;
        remaining %= 10000;
    }
    // Handle hundreds (100 - 9,900)
    if (remaining >= 100) {
        const hundredsValue = Math.floor(remaining / 100);
        result +=
            hundredsValue === 1
                ? geezHundreds
                : toGeezNumerals(hundredsValue) + geezHundreds;
        remaining %= 100;
    }
    // Handle tens (10 - 90)
    if (remaining >= 10) {
        const tensValue = Math.floor(remaining / 10);
        result += geezTens[tensValue - 1];
        remaining %= 10;
    }
    // Handle ones (1 - 9)
    if (remaining > 0) {
        result += geezDigits[remaining - 1];
    }
    return result;
}
