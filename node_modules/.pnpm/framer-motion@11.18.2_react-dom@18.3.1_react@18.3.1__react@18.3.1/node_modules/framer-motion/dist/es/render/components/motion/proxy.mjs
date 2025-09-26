import { createDOMMotionComponentProxy } from '../create-proxy.mjs';
import { createMotionComponent } from './create.mjs';

const motion = /*@__PURE__*/ createDOMMotionComponentProxy(createMotionComponent);

export { motion };
