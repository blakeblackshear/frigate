/**
 *  Elements are drawn in a specific order based on compound depth (low to high), the element type (nodes above edges),
 *  and z-index (low to high).  These styles affect how this applies:
 *
 *  z-compound-depth: May be `bottom | orphan | auto | top`.  The first drawn is `bottom`, then `orphan` which is the
 *      same depth as the root of the compound graph, followed by the default value `auto` which draws in order from
 *      root to leaves of the compound graph.  The last drawn is `top`.
 *  z-index-compare: May be `auto | manual`.  The default value is `auto` which always draws edges under nodes.
 *      `manual` ignores this convention and draws based on the `z-index` value setting.
 *  z-index: An integer value that affects the relative draw order of elements.  In general, an element with a higher
 *      `z-index` will be drawn on top of an element with a lower `z-index`.
 */
import * as util from '../util/index.mjs';

let zIndexSort = function( a, b ){
  let cy = a.cy();
  let hasCompoundNodes = cy.hasCompoundNodes();

  function getDepth(ele){
    let style = ele.pstyle( 'z-compound-depth' );
    if ( style.value === 'auto' ){
      return hasCompoundNodes ? ele.zDepth() : 0;
    } else if ( style.value === 'bottom' ){
      return -1;
    } else if ( style.value === 'top' ){
      return util.MAX_INT;
    }
    // 'orphan'
    return 0;
  }
  let depthDiff = getDepth(a) - getDepth(b);
  if ( depthDiff !== 0 ){
    return depthDiff;
  }

  function getEleDepth(ele){
    let style = ele.pstyle( 'z-index-compare' );
    if ( style.value === 'auto' ){
      return ele.isNode() ? 1 : 0;
    }
    // 'manual'
    return 0;
  }
  let eleDiff = getEleDepth(a) - getEleDepth(b);
  if ( eleDiff !== 0 ){
    return eleDiff;
  }

  let zDiff = a.pstyle( 'z-index' ).value - b.pstyle( 'z-index' ).value;
  if ( zDiff !== 0 ){
    return zDiff;
  }
  // compare indices in the core (order added to graph w/ last on top)
  return a.poolIndex() - b.poolIndex();
};

export default zIndexSort;
