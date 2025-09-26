import { resizeElement } from './handle-element.mjs';
import { resizeWindow } from './handle-window.mjs';

function resize(a, b) {
    return typeof a === "function" ? resizeWindow(a) : resizeElement(a, b);
}

export { resize };
