import { createDOMMotionComponentProxy } from '../create-proxy.mjs';
import { createMinimalMotionComponent } from './create.mjs';

const m = /*@__PURE__*/ createDOMMotionComponentProxy(createMinimalMotionComponent);

export { m };
