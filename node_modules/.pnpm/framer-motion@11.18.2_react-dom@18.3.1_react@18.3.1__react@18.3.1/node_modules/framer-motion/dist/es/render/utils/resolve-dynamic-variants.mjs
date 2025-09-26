import { resolveVariantFromProps } from './resolve-variants.mjs';

function resolveVariant(visualElement, definition, custom) {
    const props = visualElement.getProps();
    return resolveVariantFromProps(props, definition, custom !== undefined ? custom : props.custom, visualElement);
}

export { resolveVariant };
