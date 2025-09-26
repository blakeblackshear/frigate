import { isBezierDefinition } from 'motion-dom';
import { invariant, noop } from 'motion-utils';
import { anticipate } from '../anticipate.mjs';
import { backIn, backInOut, backOut } from '../back.mjs';
import { circIn, circInOut, circOut } from '../circ.mjs';
import { cubicBezier } from '../cubic-bezier.mjs';
import { easeIn, easeInOut, easeOut } from '../ease.mjs';

const easingLookup = {
    linear: noop,
    easeIn,
    easeInOut,
    easeOut,
    circIn,
    circInOut,
    circOut,
    backIn,
    backInOut,
    backOut,
    anticipate,
};
const easingDefinitionToFunction = (definition) => {
    if (isBezierDefinition(definition)) {
        // If cubic bezier definition, create bezier curve
        invariant(definition.length === 4, `Cubic bezier arrays must contain four numerical values.`);
        const [x1, y1, x2, y2] = definition;
        return cubicBezier(x1, y1, x2, y2);
    }
    else if (typeof definition === "string") {
        // Else lookup from table
        invariant(easingLookup[definition] !== undefined, `Invalid easing type '${definition}'`);
        return easingLookup[definition];
    }
    return definition;
};

export { easingDefinitionToFunction };
