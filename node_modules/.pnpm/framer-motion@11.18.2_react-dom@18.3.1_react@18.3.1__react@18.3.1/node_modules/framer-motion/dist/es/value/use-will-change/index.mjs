import { useConstant } from '../../utils/use-constant.mjs';
import { WillChangeMotionValue } from './WillChangeMotionValue.mjs';

function useWillChange() {
    return useConstant(() => new WillChangeMotionValue("auto"));
}

export { useWillChange };
