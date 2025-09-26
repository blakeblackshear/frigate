import { ISizeCalculationResult } from './types/interface.js';

declare const setConcurrency: (c: number) => void;
/**
 * @param {string} filePath - relative/absolute path of the image file
 */
declare const imageSizeFromFile: (filePath: string) => Promise<ISizeCalculationResult>;

export { imageSizeFromFile, setConcurrency };
