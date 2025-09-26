import { noop } from './noop.mjs';

let warning = noop;
let invariant = noop;
if (process.env.NODE_ENV !== "production") {
    warning = (check, message) => {
        if (!check && typeof console !== "undefined") {
            console.warn(message);
        }
    };
    invariant = (check, message) => {
        if (!check) {
            throw new Error(message);
        }
    };
}

export { invariant, warning };
