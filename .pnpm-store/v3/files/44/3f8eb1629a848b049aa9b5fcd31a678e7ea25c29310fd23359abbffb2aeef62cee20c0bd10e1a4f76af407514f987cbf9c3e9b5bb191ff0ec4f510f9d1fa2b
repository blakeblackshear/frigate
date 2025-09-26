export * from './exports';
import { unstable_batchedUpdates as batch } from './utils/reactBatchedUpdates';
import { setBatch } from './utils/batch'; // Enable batched updates in our subscriptions for use
// with standard React renderers (ReactDOM, React Native)

setBatch(batch);
export { batch };