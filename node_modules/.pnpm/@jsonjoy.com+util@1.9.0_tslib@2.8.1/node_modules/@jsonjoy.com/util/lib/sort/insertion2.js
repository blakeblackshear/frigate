"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sort = void 0;
const sort = (arr, comparator) => {
    const length = arr.length;
    for (let i = 1; i < length; i++) {
        const currentValue = arr[i];
        let position = i;
        while (position !== 0 && comparator(arr[position - 1], currentValue) > 0) {
            arr[position] = arr[position - 1];
            position--;
        }
        arr[position] = currentValue;
    }
    return arr;
};
exports.sort = sort;
//# sourceMappingURL=insertion2.js.map