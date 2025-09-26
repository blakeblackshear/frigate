var bomb = {
    /**
     * @private
     * @type {Object}
     */
    code: { // @todo: could be shifted to outside the bomb object
        FEFF: 0xFEFF,
        BBBF: 0xBBBF,
        FE: 0xFE,
        FF: 0xFF,
        EF: 0xEF,
        BB: 0xBB,
        BF: 0xBF
    },

    /**
     * Checks whether string has BOM
     * @param {String} str An input string that is tested for the presence of BOM
     *
     * @returns {Number} If greater than 0, implies that a BOM of returned length was found. Else, zero is returned.
     */
    indexOfBOM: function (str) {
        if (typeof str !== 'string') {
            return 0;
        }

        // @todo: compress logic below
        // remove UTF-16 and UTF-32 BOM (https://en.wikipedia.org/wiki/Byte_order_mark#UTF-8)
        if ((str.charCodeAt(0) === bomb.code.FEFF) || (str.charCodeAt(0) === bomb.code.BBBF)) {
            return 1;
        }

        // big endian UTF-16 BOM
        if ((str.charCodeAt(0) === bomb.code.FE) && (str.charCodeAt(1) === bomb.code.FF)) {
            return 2;
        }

        // little endian UTF-16 BOM
        if ((str.charCodeAt(0) === bomb.code.FF) && (str.charCodeAt(1) === bomb.code.FE)) {
            return 2;
        }

        // UTF-8 BOM
        if ((str.charCodeAt(0) === bomb.code.EF) && (str.charCodeAt(1) === bomb.code.BB) &&
            (str.charCodeAt(2) === bomb.code.BF)) {
            return 3;
        }

        return 0;
    },

    /**
     * Trim BOM from a string
     *
     * @param {String} str An input string that is tested for the presence of BOM
     * @returns {String} The input string stripped of any BOM, if found. If the input is not a string, it is returned as
     *                   is.
     */
    trim: function (str) {
        var pos = bomb.indexOfBOM(str);
        return pos ? str.slice(pos) : str;
    }
};

module.exports = bomb;
