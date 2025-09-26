import { createProjectionNode } from './create-projection-node.mjs';
import { addDomEvent } from '../../events/add-dom-event.mjs';

const DocumentProjectionNode = createProjectionNode({
    attachResizeListener: (ref, notify) => addDomEvent(ref, "resize", notify),
    measureScroll: () => ({
        x: document.documentElement.scrollLeft || document.body.scrollLeft,
        y: document.documentElement.scrollTop || document.body.scrollTop,
    }),
    checkIsScrollRoot: () => true,
});

export { DocumentProjectionNode };
