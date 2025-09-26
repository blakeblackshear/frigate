export const styleToString = (obj) => {
    return Object.keys(obj).reduce((acc, k) => {
        const value = obj[k];
        if (value == null) {
            return acc;
        }
        return acc + `${k}:${value};`;
    }, "");
};
export const defaultGetKey = (_data, i) => "_" + i;
export function* iterRange([start, end]) {
    for (let i = start; i <= end; i++) {
        yield i;
    }
}
