import { alpha } from '../../../value/types/numbers/index.mjs';
import { px } from '../../../value/types/numbers/units.mjs';
import { browserNumberValueTypes } from './number-browser.mjs';
import { transformValueTypes } from './transform.mjs';
import { int } from './type-int.mjs';

const numberValueTypes = {
    ...browserNumberValueTypes,
    ...transformValueTypes,
    zIndex: int,
    size: px,
    // SVG
    fillOpacity: alpha,
    strokeOpacity: alpha,
    numOctaves: int,
};

export { numberValueTypes };
