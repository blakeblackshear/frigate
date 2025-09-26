import { topsort, CycleException } from './topsort.js';

export { isAcyclic };

function isAcyclic(g) {
  try {
    topsort(g);
  } catch (e) {
    if (e instanceof CycleException) {
      return false;
    }
    throw e;
  }
  return true;
}
