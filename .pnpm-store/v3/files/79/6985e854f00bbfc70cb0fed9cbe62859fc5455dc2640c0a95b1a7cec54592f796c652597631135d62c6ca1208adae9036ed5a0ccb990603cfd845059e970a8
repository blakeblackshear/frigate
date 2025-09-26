import { isSVGElement } from '../../render/dom/utils/is-svg-element.mjs';
import { SVGVisualElement } from '../../render/svg/SVGVisualElement.mjs';
import { HTMLVisualElement } from '../../render/html/HTMLVisualElement.mjs';
import { visualElementStore } from '../../render/store.mjs';
import { ObjectVisualElement } from '../../render/object/ObjectVisualElement.mjs';

function createDOMVisualElement(element) {
    const options = {
        presenceContext: null,
        props: {},
        visualState: {
            renderState: {
                transform: {},
                transformOrigin: {},
                style: {},
                vars: {},
                attrs: {},
            },
            latestValues: {},
        },
    };
    const node = isSVGElement(element)
        ? new SVGVisualElement(options)
        : new HTMLVisualElement(options);
    node.mount(element);
    visualElementStore.set(element, node);
}
function createObjectVisualElement(subject) {
    const options = {
        presenceContext: null,
        props: {},
        visualState: {
            renderState: {
                output: {},
            },
            latestValues: {},
        },
    };
    const node = new ObjectVisualElement(options);
    node.mount(subject);
    visualElementStore.set(subject, node);
}

export { createDOMVisualElement, createObjectVisualElement };
