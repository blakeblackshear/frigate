import { createBox } from '../../projection/geometry/models.mjs';
import { DOMVisualElement } from '../dom/DOMVisualElement.mjs';
import { camelToDash } from '../dom/utils/camel-to-dash.mjs';
import { getDefaultValueType } from '../dom/value-types/defaults.mjs';
import { transformProps } from '../html/utils/keys-transform.mjs';
import { buildSVGAttrs } from './utils/build-attrs.mjs';
import { camelCaseAttributes } from './utils/camel-case-attrs.mjs';
import { isSVGTag } from './utils/is-svg-tag.mjs';
import { renderSVG } from './utils/render.mjs';
import { scrapeMotionValuesFromProps } from './utils/scrape-motion-values.mjs';

class SVGVisualElement extends DOMVisualElement {
    constructor() {
        super(...arguments);
        this.type = "svg";
        this.isSVGTag = false;
        this.measureInstanceViewportBox = createBox;
    }
    getBaseTargetFromProps(props, key) {
        return props[key];
    }
    readValueFromInstance(instance, key) {
        if (transformProps.has(key)) {
            const defaultType = getDefaultValueType(key);
            return defaultType ? defaultType.default || 0 : 0;
        }
        key = !camelCaseAttributes.has(key) ? camelToDash(key) : key;
        return instance.getAttribute(key);
    }
    scrapeMotionValuesFromProps(props, prevProps, visualElement) {
        return scrapeMotionValuesFromProps(props, prevProps, visualElement);
    }
    build(renderState, latestValues, props) {
        buildSVGAttrs(renderState, latestValues, this.isSVGTag, props.transformTemplate);
    }
    renderInstance(instance, renderState, styleProp, projection) {
        renderSVG(instance, renderState, styleProp, projection);
    }
    mount(instance) {
        this.isSVGTag = isSVGTag(instance.tagName);
        super.mount(instance);
    }
}

export { SVGVisualElement };
