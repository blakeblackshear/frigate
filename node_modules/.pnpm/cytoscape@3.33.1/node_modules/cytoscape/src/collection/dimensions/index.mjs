import * as util from '../../util/index.mjs';
import position from './position.mjs';
import bounds from './bounds.mjs';
import widthHeight from './width-height.mjs';
import edgePoints from './edge-points.mjs';

export default util.assign( {}, position, bounds, widthHeight, edgePoints );
