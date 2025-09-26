import { transformPropOrder } from './keys-transform.mjs';

const positionalKeys = new Set([
    "width",
    "height",
    "top",
    "left",
    "right",
    "bottom",
    ...transformPropOrder,
]);

export { positionalKeys };
