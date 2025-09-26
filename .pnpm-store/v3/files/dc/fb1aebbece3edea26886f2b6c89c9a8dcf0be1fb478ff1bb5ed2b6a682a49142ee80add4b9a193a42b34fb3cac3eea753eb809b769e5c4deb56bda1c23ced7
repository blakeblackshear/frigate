import { clamp } from '../utils/clamp.mjs';

function steps(numSteps, direction = "end") {
    return (progress) => {
        progress =
            direction === "end"
                ? Math.min(progress, 0.999)
                : Math.max(progress, 0.001);
        const expanded = progress * numSteps;
        const rounded = direction === "end" ? Math.floor(expanded) : Math.ceil(expanded);
        return clamp(0, 1, rounded / numSteps);
    };
}

export { steps };
