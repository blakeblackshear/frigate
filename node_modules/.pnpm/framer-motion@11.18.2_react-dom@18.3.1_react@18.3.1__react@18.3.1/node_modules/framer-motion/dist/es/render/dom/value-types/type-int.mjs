import { number } from '../../../value/types/numbers/index.mjs';

const int = {
    ...number,
    transform: Math.round,
};

export { int };
