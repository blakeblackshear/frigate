import { addDomEvent } from './add-dom-event.mjs';
import { addPointerInfo } from './event-info.mjs';

function addPointerEvent(target, eventName, handler, options) {
    return addDomEvent(target, eventName, addPointerInfo(handler), options);
}

export { addPointerEvent };
