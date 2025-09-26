import { acceleratedValues } from '../../animation/animators/utils/accelerated-values.mjs';
import { camelToDash } from '../../render/dom/utils/camel-to-dash.mjs';
import { transformProps } from '../../render/html/utils/keys-transform.mjs';

function getWillChangeName(name) {
    if (transformProps.has(name)) {
        return "transform";
    }
    else if (acceleratedValues.has(name)) {
        return camelToDash(name);
    }
}

export { getWillChangeName };
