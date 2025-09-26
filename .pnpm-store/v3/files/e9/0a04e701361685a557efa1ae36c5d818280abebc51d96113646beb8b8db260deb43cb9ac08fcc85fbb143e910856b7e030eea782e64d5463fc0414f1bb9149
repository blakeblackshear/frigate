import { color } from '../../../value/types/color/index.mjs';
import { complex } from '../../../value/types/complex/index.mjs';
import { dimensionValueTypes } from './dimensions.mjs';
import { testValueType } from './test.mjs';

/**
 * A list of all ValueTypes
 */
const valueTypes = [...dimensionValueTypes, color, complex];
/**
 * Tests a value against the list of ValueTypes
 */
const findValueType = (v) => valueTypes.find(testValueType(v));

export { findValueType };
