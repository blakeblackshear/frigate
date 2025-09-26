/* MAIN */
const Lang = {
    /* API */
    clamp: (number, lower, upper) => {
        if (lower > upper)
            return Math.min(lower, Math.max(upper, number));
        return Math.min(upper, Math.max(lower, number));
    },
    round: (number) => {
        return Math.round(number * 10000000000) / 10000000000;
    }
};
/* EXPORT */
export default Lang;
