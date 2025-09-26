import { imageType } from './types/index.mjs';
import { ISizeCalculationResult } from './types/interface.mjs';

/**
 * Return size information based on an Uint8Array
 *
 * @param {Uint8Array} input
 * @returns {ISizeCalculationResult}
 */
declare function imageSize(input: Uint8Array): ISizeCalculationResult;
declare const disableTypes: (types: imageType[]) => void;

export { disableTypes, imageSize };
