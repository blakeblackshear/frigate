import { imageType } from './types/index.js';
import './types/interface.js';

declare function detector(input: Uint8Array): imageType | undefined;

export { detector };
