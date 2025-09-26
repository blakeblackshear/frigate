export function timer(func) {
    const start = new Date().getTime();
    const val = func();
    const end = new Date().getTime();
    const total = end - start;
    return { time: total, value: val };
}
//# sourceMappingURL=timer.js.map