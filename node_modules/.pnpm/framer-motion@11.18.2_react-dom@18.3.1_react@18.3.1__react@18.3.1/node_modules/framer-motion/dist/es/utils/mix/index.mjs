import { getMixer } from './complex.mjs';
import { mixNumber } from './number.mjs';

function mix(from, to, p) {
    if (typeof from === "number" &&
        typeof to === "number" &&
        typeof p === "number") {
        return mixNumber(from, to, p);
    }
    const mixer = getMixer(from);
    return mixer(from, to);
}

export { mix };
