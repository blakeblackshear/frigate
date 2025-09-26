import * as _ from 'lodash-es';
import { tarjan } from './tarjan.js';

export { findCycles };

function findCycles(g) {
  return _.filter(tarjan(g), function (cmpt) {
    return cmpt.length > 1 || (cmpt.length === 1 && g.hasEdge(cmpt[0], cmpt[0]));
  });
}
