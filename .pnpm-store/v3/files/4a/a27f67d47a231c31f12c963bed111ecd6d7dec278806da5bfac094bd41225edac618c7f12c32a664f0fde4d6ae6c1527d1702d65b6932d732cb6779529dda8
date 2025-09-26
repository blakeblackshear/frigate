import * as math from '../../../../math.mjs';
import * as is from '../../../../is.mjs';
import {endsWith} from "../../../../util/index.mjs";

let BRp = {};

BRp.manualEndptToPx = function( node, prop ){
  let r = this;
  let npos = node.position();
  let w = node.outerWidth();
  let h = node.outerHeight();
  let rs = node._private.rscratch;

  if( prop.value.length === 2 ){
    let p = [
      prop.pfValue[0],
      prop.pfValue[1]
    ];

    if( prop.units[0] === '%' ){
      p[0] = p[0] * w;
    }

    if( prop.units[1] === '%' ){
      p[1] = p[1] * h;
    }

    p[0] += npos.x;
    p[1] += npos.y;

    return p;
  } else {
    let angle = prop.pfValue[0];

    angle = -Math.PI / 2 + angle; // start at 12 o'clock

    let l = 2 * Math.max( w, h );

    let p = [
      npos.x + Math.cos( angle ) * l,
      npos.y + Math.sin( angle ) * l
    ];

    return r.nodeShapes[ this.getNodeShape( node ) ].intersectLine(
      npos.x, npos.y,
      w, h,
      p[0], p[1],
      0, node.pstyle('corner-radius').value === 'auto' ? 'auto' : node.pstyle('corner-radius').pfValue, rs
    );
  }
};

BRp.findEndpoints = function( edge ){
  let r = this;
  let intersect;

  let source = edge.source()[0];
  let target = edge.target()[0];

  let srcPos = source.position();
  let tgtPos = target.position();

  let tgtArShape = edge.pstyle( 'target-arrow-shape' ).value;
  let srcArShape = edge.pstyle( 'source-arrow-shape' ).value;

  let tgtDist = edge.pstyle( 'target-distance-from-node' ).pfValue;
  let srcDist = edge.pstyle( 'source-distance-from-node' ).pfValue;

  let srcRs = source._private.rscratch;
  let tgtRs = target._private.rscratch;

  let curveStyle = edge.pstyle('curve-style').value;

  let rs = edge._private.rscratch;

  let et = rs.edgeType;
  let taxi = endsWith(curveStyle, 'taxi'); // Covers taxi and round-taxi
  let self = et === 'self' || et === 'compound';
  let bezier = et === 'bezier' || et === 'multibezier' || self;
  let multi = et !== 'bezier';
  let lines = et === 'straight' || et === 'segments';
  let segments = et === 'segments';
  let hasEndpts = bezier || multi || lines;
  let overrideEndpts = self || taxi;
  let srcManEndpt = edge.pstyle('source-endpoint');
  let srcManEndptVal = overrideEndpts ? 'outside-to-node' : srcManEndpt.value;
  let srcCornerRadius = source.pstyle('corner-radius').value === 'auto' ? 'auto' : source.pstyle('corner-radius').pfValue;
  let tgtManEndpt = edge.pstyle('target-endpoint');
  let tgtManEndptVal = overrideEndpts ? 'outside-to-node' : tgtManEndpt.value;
  let tgtCornerRadius = target.pstyle('corner-radius').value === 'auto' ? 'auto' : target.pstyle('corner-radius').pfValue;


  rs.srcManEndpt = srcManEndpt;
  rs.tgtManEndpt = tgtManEndpt;

  let p1; // last known point of edge on target side
  let p2; // last known point of edge on source side

  let p1_i; // point to intersect with target shape
  let p2_i; // point to intersect with source shape

  let tgtManEndptPt = (tgtManEndpt?.pfValue?.length === 2 ? tgtManEndpt.pfValue : null) ?? [0, 0];
  let srcManEndptPt = (srcManEndpt?.pfValue?.length === 2 ? srcManEndpt.pfValue : null) ?? [0, 0];

  if( bezier ){
    let cpStart = [ rs.ctrlpts[0], rs.ctrlpts[1] ];
    let cpEnd = multi ? [ rs.ctrlpts[ rs.ctrlpts.length - 2], rs.ctrlpts[ rs.ctrlpts.length - 1] ] : cpStart;

    p1 = cpEnd;
    p2 = cpStart;
  } else if( lines ){
    let srcArrowFromPt = !segments ? [
      tgtPos.x + tgtManEndptPt[0],
      tgtPos.y + tgtManEndptPt[1]
    ] : rs.segpts.slice( 0, 2 );
    let tgtArrowFromPt = !segments ? [
      srcPos.x + srcManEndptPt[0],
      srcPos.y + srcManEndptPt[1]
    ] : rs.segpts.slice( rs.segpts.length - 2 );

    p1 = tgtArrowFromPt;
    p2 = srcArrowFromPt;
  }

  if( tgtManEndptVal === 'inside-to-node' ){
    intersect = [ tgtPos.x, tgtPos.y ];
  } else if( tgtManEndpt.units ){
    intersect = this.manualEndptToPx( target, tgtManEndpt );
  } else if( tgtManEndptVal === 'outside-to-line' ){
    intersect = rs.tgtIntn; // use cached value from ctrlpt calc
  } else {
    if( tgtManEndptVal === 'outside-to-node' || tgtManEndptVal === 'outside-to-node-or-label' ){
      p1_i = p1;
    } else if( tgtManEndptVal === 'outside-to-line' || tgtManEndptVal === 'outside-to-line-or-label' ){
      p1_i = [ srcPos.x, srcPos.y ];
    }

    intersect = r.nodeShapes[ this.getNodeShape( target ) ].intersectLine(
      tgtPos.x,
      tgtPos.y,
      target.outerWidth(),
      target.outerHeight(),
      p1_i[0],
      p1_i[1],
      0, tgtCornerRadius, tgtRs
    );

    if( tgtManEndptVal === 'outside-to-node-or-label' || tgtManEndptVal === 'outside-to-line-or-label' ){
      let trs = target._private.rscratch;
      let lw = trs.labelWidth;
      let lh = trs.labelHeight;
      let lx = trs.labelX;
      let ly = trs.labelY;
      let lw2 = lw/2;
      let lh2 = lh/2;

      let va = target.pstyle('text-valign').value;
      if( va === 'top' ){
        ly -= lh2;
      } else if( va === 'bottom' ){
        ly += lh2;
      }

      let ha = target.pstyle('text-halign').value;
      if( ha === 'left' ){
        lx -= lw2;
      } else if( ha === 'right' ){
        lx += lw2;
      }

      let labelIntersect = math.polygonIntersectLine(p1_i[0], p1_i[1], [
        lx - lw2, ly - lh2,
        lx + lw2, ly - lh2,
        lx + lw2, ly + lh2,
        lx - lw2, ly + lh2
      ], tgtPos.x, tgtPos.y);

      if( labelIntersect.length > 0 ){
        let refPt = srcPos;
        let intSqdist = math.sqdist( refPt, math.array2point(intersect) );
        let labIntSqdist = math.sqdist( refPt, math.array2point(labelIntersect) );
        let minSqDist = intSqdist;

        if( labIntSqdist < intSqdist ){
          intersect = labelIntersect;
          minSqDist = labIntSqdist;
        }

        if( labelIntersect.length > 2 ){
          let labInt2SqDist = math.sqdist( refPt, { x: labelIntersect[2], y: labelIntersect[3] } );

          if( labInt2SqDist < minSqDist ){
            intersect = [ labelIntersect[2], labelIntersect[3] ];
          }
        }
      }
    }
  }

  let arrowEnd = math.shortenIntersection(
    intersect,
    p1,
    r.arrowShapes[ tgtArShape ].spacing( edge ) + tgtDist
  );
  let edgeEnd = math.shortenIntersection(
    intersect,
    p1,
    r.arrowShapes[ tgtArShape ].gap( edge ) + tgtDist
  );

  rs.endX = edgeEnd[0];
  rs.endY = edgeEnd[1];

  rs.arrowEndX = arrowEnd[0];
  rs.arrowEndY = arrowEnd[1];

  if( srcManEndptVal === 'inside-to-node' ){
    intersect = [ srcPos.x, srcPos.y ];
  } else if( srcManEndpt.units ){
    intersect = this.manualEndptToPx( source, srcManEndpt );
  } else if( srcManEndptVal === 'outside-to-line' ){
    intersect = rs.srcIntn; // use cached value from ctrlpt calc
  } else {
    if( srcManEndptVal === 'outside-to-node' || srcManEndptVal === 'outside-to-node-or-label' ){
      p2_i = p2;
    } else if( srcManEndptVal === 'outside-to-line' || srcManEndptVal === 'outside-to-line-or-label' ){
      p2_i = [ tgtPos.x, tgtPos.y ];
    }

    intersect = r.nodeShapes[ this.getNodeShape( source ) ].intersectLine(
      srcPos.x,
      srcPos.y,
      source.outerWidth(),
      source.outerHeight(),
      p2_i[0],
      p2_i[1],
      0, srcCornerRadius, srcRs
    );

    if( srcManEndptVal === 'outside-to-node-or-label' || srcManEndptVal === 'outside-to-line-or-label' ){
      let srs = source._private.rscratch;
      let lw = srs.labelWidth;
      let lh = srs.labelHeight;
      let lx = srs.labelX;
      let ly = srs.labelY;
      let lw2 = lw/2;
      let lh2 = lh/2;

      let va = source.pstyle('text-valign').value;
      if( va === 'top' ){
        ly -= lh2;
      } else if( va === 'bottom' ){
        ly += lh2;
      }

      let ha = source.pstyle('text-halign').value;
      if( ha === 'left' ){
        lx -= lw2;
      } else if( ha === 'right' ){
        lx += lw2;
      }

      let labelIntersect = math.polygonIntersectLine(p2_i[0], p2_i[1], [
        lx - lw2, ly - lh2,
        lx + lw2, ly - lh2,
        lx + lw2, ly + lh2,
        lx - lw2, ly + lh2
      ], srcPos.x, srcPos.y);

      if( labelIntersect.length > 0 ){
        let refPt = tgtPos;
        let intSqdist = math.sqdist( refPt, math.array2point(intersect) );
        let labIntSqdist = math.sqdist( refPt, math.array2point(labelIntersect) );
        let minSqDist = intSqdist;

        if( labIntSqdist < intSqdist ){
          intersect = [ labelIntersect[0], labelIntersect[1] ];
          minSqDist = labIntSqdist;
        }

        if( labelIntersect.length > 2 ){
          let labInt2SqDist = math.sqdist( refPt, { x: labelIntersect[2], y: labelIntersect[3] } );

          if( labInt2SqDist < minSqDist ){
            intersect = [ labelIntersect[2], labelIntersect[3] ];
          }
        }
      }
    }
  }

  let arrowStart = math.shortenIntersection(
    intersect,
    p2,
    r.arrowShapes[ srcArShape ].spacing( edge ) + srcDist
  );
  let edgeStart = math.shortenIntersection(
    intersect,
    p2,
    r.arrowShapes[ srcArShape ].gap( edge ) + srcDist
  );

  rs.startX = edgeStart[0];
  rs.startY = edgeStart[1];

  rs.arrowStartX = arrowStart[0];
  rs.arrowStartY = arrowStart[1];

  if( hasEndpts ){
    if( !is.number( rs.startX ) || !is.number( rs.startY ) || !is.number( rs.endX ) || !is.number( rs.endY ) ){
      rs.badLine = true;
    } else {
      rs.badLine = false;
    }
  }
};

BRp.getSourceEndpoint = function( edge ){
  let rs = edge[0]._private.rscratch;

  this.recalculateRenderedStyle( edge );

  switch( rs.edgeType ){
    case 'haystack':
      return {
        x: rs.haystackPts[0],
        y: rs.haystackPts[1]
      };
    default:
      return {
        x: rs.arrowStartX,
        y: rs.arrowStartY
      };
  }
};

BRp.getTargetEndpoint = function( edge ){
  let rs = edge[0]._private.rscratch;

  this.recalculateRenderedStyle( edge );

  switch( rs.edgeType ){
    case 'haystack':
      return {
        x: rs.haystackPts[2],
        y: rs.haystackPts[3]
      };
    default:
      return {
        x: rs.arrowEndX,
        y: rs.arrowEndY
      };
  }
};

export default BRp;
