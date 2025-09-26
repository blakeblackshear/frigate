import { isAnimationControls } from '../../animation/utils/is-animation-controls.mjs';
import { isVariantLabel } from './is-variant-label.mjs';
import { variantProps } from './variant-props.mjs';

function isControllingVariants(props) {
    return (isAnimationControls(props.animate) ||
        variantProps.some((name) => isVariantLabel(props[name])));
}
function isVariantNode(props) {
    return Boolean(isControllingVariants(props) || props.variants);
}

export { isControllingVariants, isVariantNode };
