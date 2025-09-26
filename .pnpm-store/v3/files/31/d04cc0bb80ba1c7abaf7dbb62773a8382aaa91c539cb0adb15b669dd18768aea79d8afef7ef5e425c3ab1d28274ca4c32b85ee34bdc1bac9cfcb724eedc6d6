import * as math from '../../../../math.mjs';
import * as is from '../../../../is.mjs';
import * as util from '../../../../util/index.mjs';
import Map from '../../../../map.mjs';
import {getRoundCorner} from "../../../../round.mjs";
import {endsWith} from "../../../../util/index.mjs";

const AVOID_IMPOSSIBLE_BEZIER_CONSTANT = 0.01;
const AVOID_IMPOSSIBLE_BEZIER_CONSTANT_L = Math.sqrt(2 * AVOID_IMPOSSIBLE_BEZIER_CONSTANT);

let BRp = {};

BRp.findMidptPtsEtc = function(edge, pairInfo) {
  let { posPts, intersectionPts, vectorNormInverse } = pairInfo;

  let midptPts;

  // n.b. assumes all edges in bezier bundle have same endpoints specified
  let srcManEndpt = edge.pstyle('source-endpoint');
  let tgtManEndpt = edge.pstyle('target-endpoint');
  const haveManualEndPts = srcManEndpt.units != null && tgtManEndpt.units != null;

  const recalcVectorNormInverse = (x1, y1, x2, y2) => {
    let dy = ( y2 - y1 );
    let dx = ( x2 - x1 );
    let l = Math.sqrt( dx * dx + dy * dy );

    return {
      x: -dy / l,
      y: dx / l
    };
  };

  const edgeDistances = edge.pstyle('edge-distances').value;

  switch(edgeDistances) {
    case 'node-position':
      midptPts = posPts;
      break;

    case 'intersection':
      midptPts = intersectionPts;
      break;

    case 'endpoints': {
      if (haveManualEndPts) {
        const [x1, y1] = this.manualEndptToPx( edge.source()[0], srcManEndpt );
        const [x2, y2] = this.manualEndptToPx( edge.target()[0], tgtManEndpt );
        const endPts = { x1, y1, x2, y2 };

        vectorNormInverse = recalcVectorNormInverse(x1, y1, x2, y2);
        midptPts = endPts;
      } else {
        util.warn(`Edge ${edge.id()} has edge-distances:endpoints specified without manual endpoints specified via source-endpoint and target-endpoint.  Falling back on edge-distances:intersection (default).`);
        midptPts = intersectionPts; // back to default
      }
      break;
    }
  }

  return { midptPts, vectorNormInverse };
};

BRp.findHaystackPoints = function( edges ){
  for( let i = 0; i < edges.length; i++ ){
    let edge = edges[i];
    let _p = edge._private;
    let rs = _p.rscratch;

    if( !rs.haystack ){
      let angle = Math.random() * 2 * Math.PI;

      rs.source = {
        x: Math.cos( angle ),
        y: Math.sin( angle )
      };

      angle = Math.random() * 2 * Math.PI;

      rs.target = {
        x: Math.cos( angle ),
        y: Math.sin( angle )
      };

    }

    let src = _p.source;
    let tgt = _p.target;
    let srcPos = src.position();
    let tgtPos = tgt.position();
    let srcW = src.width();
    let tgtW = tgt.width();
    let srcH = src.height();
    let tgtH = tgt.height();
    let radius = edge.pstyle('haystack-radius').value;
    let halfRadius = radius / 2; // b/c have to half width/height

    rs.haystackPts = rs.allpts = [
      rs.source.x * srcW * halfRadius + srcPos.x,
      rs.source.y * srcH * halfRadius + srcPos.y,
      rs.target.x * tgtW * halfRadius + tgtPos.x,
      rs.target.y * tgtH * halfRadius + tgtPos.y
    ];

    rs.midX = (rs.allpts[0] + rs.allpts[2]) / 2;
    rs.midY = (rs.allpts[1] + rs.allpts[3]) / 2;

    // always override as haystack in case set to different type previously
    rs.edgeType = 'haystack';
    rs.haystack = true;

    this.storeEdgeProjections( edge );
    this.calculateArrowAngles( edge );
    this.recalculateEdgeLabelProjections( edge );
    this.calculateLabelAngles( edge );
  }
};

BRp.findSegmentsPoints = function( edge, pairInfo ){
  // Segments (multiple straight lines)

  const rs = edge._private.rscratch;
  const segmentWs = edge.pstyle( 'segment-weights' );
  const segmentDs = edge.pstyle( 'segment-distances' );
  const segmentRs = edge.pstyle( 'segment-radii' );
  const segmentTs = edge.pstyle( 'radius-type' );
  const segmentsN = Math.min( segmentWs.pfValue.length, segmentDs.pfValue.length );

  const lastRadius = segmentRs.pfValue[ segmentRs.pfValue.length - 1 ];
  const lastRadiusType = segmentTs.pfValue[ segmentTs.pfValue.length - 1 ];

  rs.edgeType = 'segments';
  rs.segpts = [];
  rs.radii = [];
  rs.isArcRadius = [];

  for( let s = 0; s < segmentsN; s++ ){
    let w = segmentWs.pfValue[ s ];
    let d = segmentDs.pfValue[ s ];

    let w1 = 1 - w;
    let w2 = w;

    let { midptPts, vectorNormInverse } = this.findMidptPtsEtc(edge, pairInfo);

    let adjustedMidpt = {
      x: midptPts.x1 * w1 + midptPts.x2 * w2,
      y: midptPts.y1 * w1 + midptPts.y2 * w2
    };

    rs.segpts.push(
      adjustedMidpt.x + vectorNormInverse.x * d,
      adjustedMidpt.y + vectorNormInverse.y * d
    );

    rs.radii.push( segmentRs.pfValue[ s ] !== undefined ?  segmentRs.pfValue[ s ] : lastRadius );
    rs.isArcRadius.push( (segmentTs.pfValue[ s ] !== undefined ? segmentTs.pfValue[ s ] : lastRadiusType) === 'arc-radius' );
  }

};

BRp.findLoopPoints = function( edge, pairInfo, i, edgeIsUnbundled ){
  // Self-edge

  const rs = edge._private.rscratch;
  const { dirCounts, srcPos } = pairInfo;
  const ctrlptDists = edge.pstyle( 'control-point-distances' );
  const ctrlptDist = ctrlptDists ? ctrlptDists.pfValue[0] : undefined;
  const loopDir = edge.pstyle('loop-direction').pfValue;
  const loopSwp = edge.pstyle('loop-sweep').pfValue;
  const stepSize = edge.pstyle( 'control-point-step-size' ).pfValue;

  rs.edgeType = 'self';

  let j = i;
  let loopDist = stepSize;

  if( edgeIsUnbundled ){
    j = 0;
    loopDist = ctrlptDist;
  }

  let loopAngle = loopDir - Math.PI / 2;
  let outAngle =  loopAngle - loopSwp / 2;
  let inAngle =  loopAngle + loopSwp / 2;

  // increase by step size for overlapping loops, keyed on direction and sweep values
  let dc = String(loopDir + '_' + loopSwp);
  j = dirCounts[dc] === undefined ? dirCounts[dc] = 0 : ++dirCounts[dc];

  rs.ctrlpts = [
    srcPos.x + Math.cos(outAngle) * 1.4 * loopDist * (j / 3 + 1),
    srcPos.y + Math.sin(outAngle) * 1.4 * loopDist * (j / 3 + 1),
    srcPos.x + Math.cos(inAngle) * 1.4 * loopDist * (j / 3 + 1),
    srcPos.y + Math.sin(inAngle) * 1.4 * loopDist * (j / 3 + 1)
  ];
};

BRp.findCompoundLoopPoints = function( edge, pairInfo, i, edgeIsUnbundled ){
  // Compound edge

  const rs = edge._private.rscratch;

  rs.edgeType = 'compound';

  const { srcPos, tgtPos, srcW, srcH, tgtW, tgtH } = pairInfo;
  const stepSize = edge.pstyle('control-point-step-size').pfValue;
  const ctrlptDists = edge.pstyle('control-point-distances');
  const ctrlptDist = ctrlptDists ? ctrlptDists.pfValue[0] : undefined;

  let j = i;
  let loopDist = stepSize;

  if( edgeIsUnbundled ){
    j = 0;
    loopDist = ctrlptDist;
  }

  let loopW = 50;

  let loopaPos = {
    x: srcPos.x - srcW / 2,
    y: srcPos.y - srcH / 2
  };

  let loopbPos = {
    x: tgtPos.x - tgtW / 2,
    y: tgtPos.y - tgtH / 2
  };

  let loopPos = {
    x: Math.min( loopaPos.x, loopbPos.x ),
    y: Math.min( loopaPos.y, loopbPos.y )
  };

  // avoids cases with impossible beziers
  let minCompoundStretch = 0.5;
  let compoundStretchA = Math.max( minCompoundStretch, Math.log( srcW * AVOID_IMPOSSIBLE_BEZIER_CONSTANT ) );
  let compoundStretchB = Math.max( minCompoundStretch, Math.log( tgtW * AVOID_IMPOSSIBLE_BEZIER_CONSTANT ) );

  rs.ctrlpts = [
    loopPos.x,
    loopPos.y - (1 + Math.pow( loopW, 1.12 ) / 100) * loopDist * (j / 3 + 1) * compoundStretchA,

    loopPos.x - (1 + Math.pow( loopW, 1.12 ) / 100) * loopDist * (j / 3 + 1) * compoundStretchB,
    loopPos.y
  ];

};

BRp.findStraightEdgePoints = function( edge ){
  // Straight edge within bundle

  edge._private.rscratch.edgeType = 'straight';
};

BRp.findBezierPoints = function( edge, pairInfo, i, edgeIsUnbundled, edgeIsSwapped ){
  const rs = edge._private.rscratch;
  const stepSize = edge.pstyle('control-point-step-size').pfValue;
  const ctrlptDists = edge.pstyle('control-point-distances');
  const ctrlptWs = edge.pstyle('control-point-weights');
  const bezierN = ctrlptDists && ctrlptWs ? Math.min( ctrlptDists.value.length, ctrlptWs.value.length ) : 1;

  let ctrlptDist = ctrlptDists ? ctrlptDists.pfValue[0] : undefined;
  let ctrlptWeight = ctrlptWs.value[0];

  // (Multi)bezier

  const multi = edgeIsUnbundled;

  rs.edgeType = multi ? 'multibezier' : 'bezier';
  rs.ctrlpts = [];

  for( let b = 0; b < bezierN; b++ ){
    let normctrlptDist = (0.5 - pairInfo.eles.length / 2 + i) * stepSize * (edgeIsSwapped ? -1 : 1);
    let manctrlptDist;
    let sign = math.signum( normctrlptDist );

    if( multi ){
      ctrlptDist = ctrlptDists ? ctrlptDists.pfValue[ b ] : stepSize; // fall back on step size
      ctrlptWeight = ctrlptWs.value[ b ];
    }

    if( edgeIsUnbundled ){ // multi or single unbundled
      manctrlptDist = ctrlptDist;
    } else {
      manctrlptDist = ctrlptDist !== undefined ? sign * ctrlptDist : undefined;
    }

    let distanceFromMidpoint = manctrlptDist !== undefined ? manctrlptDist : normctrlptDist;

    let w1 = 1 - ctrlptWeight;
    let w2 = ctrlptWeight;

    let { midptPts, vectorNormInverse } = this.findMidptPtsEtc(edge, pairInfo);

    let adjustedMidpt = {
      x: midptPts.x1 * w1 + midptPts.x2 * w2,
      y: midptPts.y1 * w1 + midptPts.y2 * w2
    };

    rs.ctrlpts.push(
      adjustedMidpt.x + vectorNormInverse.x * distanceFromMidpoint,
      adjustedMidpt.y + vectorNormInverse.y * distanceFromMidpoint
    );
  }
};

BRp.findTaxiPoints = function( edge, pairInfo ){
  // Taxicab geometry with two turns maximum

  const rs = edge._private.rscratch;

  rs.edgeType = 'segments';

  const VERTICAL = 'vertical';
  const HORIZONTAL = 'horizontal';
  const LEFTWARD = 'leftward';
  const RIGHTWARD = 'rightward';
  const DOWNWARD = 'downward';
  const UPWARD = 'upward';
  const AUTO = 'auto';

  const { posPts, srcW, srcH, tgtW, tgtH } = pairInfo;
  const edgeDistances = edge.pstyle('edge-distances').value;
  const dIncludesNodeBody = edgeDistances !== 'node-position';
  let taxiDir = edge.pstyle('taxi-direction').value;
  let rawTaxiDir = taxiDir; // unprocessed value
  const taxiTurn = edge.pstyle('taxi-turn');
  const turnIsPercent = taxiTurn.units === '%';
  const taxiTurnPfVal = taxiTurn.pfValue;
  const turnIsNegative = taxiTurnPfVal < 0; // i.e. from target side
  let minD = edge.pstyle('taxi-turn-min-distance').pfValue;
  const dw = (dIncludesNodeBody ? (srcW + tgtW)/2 : 0);
  const dh = (dIncludesNodeBody ? (srcH + tgtH)/2 : 0);
  const pdx = posPts.x2 - posPts.x1;
  const pdy = posPts.y2 - posPts.y1;

  // take away the effective w/h from the magnitude of the delta value
  const subDWH = (dxy, dwh) => {
    if( dxy > 0 ){
      return Math.max(dxy - dwh, 0);
    } else {
      return Math.min(dxy + dwh, 0);
    }
  };

  const dx = subDWH(pdx, dw);
  const dy = subDWH(pdy, dh);

  let isExplicitDir = false;

  if( rawTaxiDir === AUTO ){
    taxiDir = Math.abs(dx) > Math.abs(dy) ? HORIZONTAL : VERTICAL;
  } else if( rawTaxiDir === UPWARD || rawTaxiDir === DOWNWARD ){
    taxiDir = VERTICAL;
    isExplicitDir = true;
  } else if( rawTaxiDir === LEFTWARD || rawTaxiDir === RIGHTWARD ){
    taxiDir = HORIZONTAL;
    isExplicitDir = true;
  }

  const isVert = taxiDir === VERTICAL;
  let l = isVert ? dy : dx;
  let pl = isVert ? pdy : pdx;
  let sgnL = math.signum(pl);

  let forcedDir = false;
  if(
    !(isExplicitDir && (turnIsPercent || turnIsNegative)) // forcing in this case would cause weird growing in the opposite direction
    && (
      (rawTaxiDir === DOWNWARD && pl < 0)
      || (rawTaxiDir === UPWARD && pl > 0)
      || (rawTaxiDir === LEFTWARD && pl > 0)
      || (rawTaxiDir === RIGHTWARD && pl < 0)
    )
  ){
    sgnL *= -1;
    l = sgnL * Math.abs(l);

    forcedDir = true;
  }

  let d;

  if( turnIsPercent ){
    const p = taxiTurnPfVal < 0 ? (1 + taxiTurnPfVal) : (taxiTurnPfVal);

    d = p * l;
  } else {
    const k = taxiTurnPfVal < 0 ? (l) : (0);

    d = k + taxiTurnPfVal * sgnL;
  }

  const getIsTooClose = d => Math.abs(d) < minD || Math.abs(d) >= Math.abs(l);
  const isTooCloseSrc = getIsTooClose(d);
  const isTooCloseTgt =  getIsTooClose(Math.abs(l) - Math.abs(d));
  const isTooClose = isTooCloseSrc || isTooCloseTgt;

  if( isTooClose && !forcedDir ){ // non-ideal routing
    if( isVert ){ // vertical fallbacks
      const lShapeInsideSrc = Math.abs(pl) <= srcH/2;
      const lShapeInsideTgt = Math.abs(pdx) <= tgtW/2;

      if( lShapeInsideSrc ){ // horizontal Z-shape (direction not respected)
        let x = (posPts.x1 + posPts.x2)/2;
        let { y1, y2 } = posPts;

        rs.segpts = [
          x, y1,
          x, y2
        ];
      } else if( lShapeInsideTgt ){ // vertical Z-shape (distance not respected)
        let y = (posPts.y1 + posPts.y2)/2;
        let { x1, x2 } = posPts;

        rs.segpts = [
          x1, y,
          x2, y
        ];
      } else { // L-shape fallback (turn distance not respected, but works well with tree siblings)
        rs.segpts = [
          posPts.x1, posPts.y2
        ];
      }

    } else { // horizontal fallbacks
      const lShapeInsideSrc = Math.abs(pl) <= srcW/2;
      const lShapeInsideTgt = Math.abs(pdy) <= tgtH/2;

      if( lShapeInsideSrc ){ // vertical Z-shape (direction not respected)
        let y = (posPts.y1 + posPts.y2)/2;
        let { x1, x2 } = posPts;

        rs.segpts = [
          x1, y,
          x2, y
        ];
      } else if( lShapeInsideTgt ){ // horizontal Z-shape (turn distance not respected)
        let x = (posPts.x1 + posPts.x2)/2;
        let { y1, y2 } = posPts;

        rs.segpts = [
          x, y1,
          x, y2
        ];
      } else { // L-shape (turn distance not respected, but works well for tree siblings)
        rs.segpts = [
          posPts.x2,
          posPts.y1
        ];
      }
    }
  } else { // ideal routing
    if( isVert ){
      let y = posPts.y1 + d + (dIncludesNodeBody ? srcH/2 * sgnL : 0);
      let { x1, x2 } = posPts;

      rs.segpts = [
        x1, y,
        x2, y
      ];
    } else { // horizontal
      let x = posPts.x1 + d + (dIncludesNodeBody ? srcW/2 * sgnL : 0);
      let { y1, y2 } = posPts;

      rs.segpts = [
        x, y1,
        x, y2
      ];
    }
  }

  if (rs.isRound) {
    const radius = edge.pstyle( 'taxi-radius' ).value;
    const isArcRadius = edge.pstyle( 'radius-type' ).value[0] === 'arc-radius';
    rs.radii = new Array( rs.segpts.length / 2 ).fill( radius );
    rs.isArcRadius = new Array( rs.segpts.length / 2 ).fill( isArcRadius );
  }
};

BRp.tryToCorrectInvalidPoints = function( edge, pairInfo ){
  const rs = edge._private.rscratch;

  // can only correct beziers for now...
  if( rs.edgeType === 'bezier' ){
    const { srcPos, tgtPos, srcW, srcH, tgtW, tgtH, srcShape, tgtShape, srcCornerRadius, tgtCornerRadius, srcRs, tgtRs } = pairInfo;

    let badStart = !is.number( rs.startX ) || !is.number( rs.startY );
    let badAStart = !is.number( rs.arrowStartX ) || !is.number( rs.arrowStartY );
    let badEnd = !is.number( rs.endX ) || !is.number( rs.endY );
    let badAEnd = !is.number( rs.arrowEndX ) || !is.number( rs.arrowEndY );

    let minCpADistFactor = 3;
    let arrowW = this.getArrowWidth( edge.pstyle( 'width' ).pfValue, edge.pstyle( 'arrow-scale' ).value )
      * this.arrowShapeWidth;
    let minCpADist = minCpADistFactor * arrowW;

    let startACpDist = math.dist( { x: rs.ctrlpts[0], y: rs.ctrlpts[1] }, { x: rs.startX, y: rs.startY } );
    let closeStartACp = startACpDist < minCpADist;
    let endACpDist = math.dist( { x: rs.ctrlpts[0], y: rs.ctrlpts[1] }, { x: rs.endX, y: rs.endY } );
    let closeEndACp = endACpDist < minCpADist;

    let overlapping = false;

    if( badStart || badAStart || closeStartACp ){
      overlapping = true;

      // project control point along line from src centre to outside the src shape
      // (otherwise intersection will yield nothing)
      let cpD = { // delta
        x: rs.ctrlpts[0] - srcPos.x,
        y: rs.ctrlpts[1] - srcPos.y
      };
      let cpL = Math.sqrt( cpD.x * cpD.x + cpD.y * cpD.y ); // length of line
      let cpM = { // normalised delta
        x: cpD.x / cpL,
        y: cpD.y / cpL
      };
      let radius = Math.max( srcW, srcH );
      let cpProj = { // *2 radius guarantees outside shape
        x: rs.ctrlpts[0] + cpM.x * 2 * radius,
        y: rs.ctrlpts[1] + cpM.y * 2 * radius
      };

      let srcCtrlPtIntn = srcShape.intersectLine(
        srcPos.x,
        srcPos.y,
        srcW,
        srcH,
        cpProj.x,
        cpProj.y,
        0, srcCornerRadius, srcRs
      );

      if( closeStartACp ){
        rs.ctrlpts[0] = rs.ctrlpts[0] + cpM.x * (minCpADist - startACpDist);
        rs.ctrlpts[1] = rs.ctrlpts[1] + cpM.y * (minCpADist - startACpDist);
      } else {
        rs.ctrlpts[0] = srcCtrlPtIntn[0] + cpM.x * minCpADist;
        rs.ctrlpts[1] = srcCtrlPtIntn[1] + cpM.y * minCpADist;
      }
    }

    if( badEnd || badAEnd || closeEndACp ){
      overlapping = true;

      // project control point along line from tgt centre to outside the tgt shape
      // (otherwise intersection will yield nothing)
      let cpD = { // delta
        x: rs.ctrlpts[0] - tgtPos.x,
        y: rs.ctrlpts[1] - tgtPos.y
      };
      let cpL = Math.sqrt( cpD.x * cpD.x + cpD.y * cpD.y ); // length of line
      let cpM = { // normalised delta
        x: cpD.x / cpL,
        y: cpD.y / cpL
      };
      let radius = Math.max( srcW, srcH );
      let cpProj = { // *2 radius guarantees outside shape
        x: rs.ctrlpts[0] + cpM.x * 2 * radius,
        y: rs.ctrlpts[1] + cpM.y * 2 * radius
      };

      let tgtCtrlPtIntn = tgtShape.intersectLine(
        tgtPos.x,
        tgtPos.y,
        tgtW,
        tgtH,
        cpProj.x,
        cpProj.y,
        0, tgtCornerRadius, tgtRs
      );

      if( closeEndACp ){
        rs.ctrlpts[0] = rs.ctrlpts[0] + cpM.x * (minCpADist - endACpDist);
        rs.ctrlpts[1] = rs.ctrlpts[1] + cpM.y * (minCpADist - endACpDist);
      } else {
        rs.ctrlpts[0] = tgtCtrlPtIntn[0] + cpM.x * minCpADist;
        rs.ctrlpts[1] = tgtCtrlPtIntn[1] + cpM.y * minCpADist;
      }

    }

    if( overlapping ){
      // recalc endpts
      this.findEndpoints( edge );
    }

  }
};

BRp.storeAllpts = function( edge ){
  let rs = edge._private.rscratch;

  if( rs.edgeType === 'multibezier' || rs.edgeType === 'bezier' || rs.edgeType === 'self' || rs.edgeType === 'compound' ){
    rs.allpts = [];

    rs.allpts.push( rs.startX, rs.startY );

    for( let b = 0; b + 1 < rs.ctrlpts.length; b += 2 ){
      // ctrl pt itself
      rs.allpts.push( rs.ctrlpts[ b ], rs.ctrlpts[ b + 1] );

      // the midpt between ctrlpts as intermediate destination pts
      if( b + 3 < rs.ctrlpts.length ){
        rs.allpts.push( (rs.ctrlpts[ b ] + rs.ctrlpts[ b + 2]) / 2, (rs.ctrlpts[ b + 1] + rs.ctrlpts[ b + 3]) / 2 );
      }
    }

    rs.allpts.push( rs.endX, rs.endY );

    let m, mt;
    if( rs.ctrlpts.length / 2 % 2 === 0 ){
      m = rs.allpts.length / 2 - 1;

      rs.midX = rs.allpts[ m ];
      rs.midY = rs.allpts[ m + 1];
    } else {
      m = rs.allpts.length / 2 - 3;
      mt = 0.5;

      rs.midX = math.qbezierAt( rs.allpts[ m ], rs.allpts[ m + 2], rs.allpts[ m + 4], mt );
      rs.midY = math.qbezierAt( rs.allpts[ m + 1], rs.allpts[ m + 3], rs.allpts[ m + 5], mt );
    }

  } else if( rs.edgeType === 'straight' ){
    // need to calc these after endpts
    rs.allpts = [ rs.startX, rs.startY, rs.endX, rs.endY ];

    // default midpt for labels etc
    rs.midX = ( rs.startX + rs.endX + rs.arrowStartX + rs.arrowEndX ) / 4;
    rs.midY = ( rs.startY + rs.endY + rs.arrowStartY + rs.arrowEndY ) / 4;

  } else if( rs.edgeType === 'segments' ){
    rs.allpts = [];
    rs.allpts.push( rs.startX, rs.startY );
    rs.allpts.push.apply( rs.allpts, rs.segpts );
    rs.allpts.push( rs.endX, rs.endY );

    if( rs.isRound ){
      rs.roundCorners = [];

      for( let i = 2; i + 3 < rs.allpts.length; i += 2 ){
        let radius = rs.radii[ (i / 2)  - 1];
        let isArcRadius = rs.isArcRadius[ (i / 2)  - 1 ];
        rs.roundCorners.push(
          getRoundCorner(
            {x: rs.allpts[i - 2], y: rs.allpts[i - 1]},
            {x: rs.allpts[i], y: rs.allpts[i + 1], radius},
            {x: rs.allpts[i + 2], y: rs.allpts[i + 3]},
            radius, isArcRadius
          )
        );
      }
    }

    if( rs.segpts.length % 4 === 0 ){
      let i2 = rs.segpts.length / 2;
      let i1 = i2 - 2;

      rs.midX = ( rs.segpts[ i1 ] + rs.segpts[ i2 ] ) / 2;
      rs.midY = ( rs.segpts[ i1 + 1] + rs.segpts[ i2 + 1] ) / 2;
    } else {
      let i1 = rs.segpts.length / 2 - 1;
      if( !rs.isRound ){
        rs.midX = rs.segpts[ i1 ];
        rs.midY = rs.segpts[ i1 + 1 ];
      } else {
        let point = {x: rs.segpts[i1], y: rs.segpts[i1 + 1]};
        const corner = rs.roundCorners[i1 / 2];
        if( corner.radius === 0 ){ // On collinear points
          const nextPoint = {x: rs.segpts[i1 + 2], y: rs.segpts[i1 + 3]};
          rs.midX = point.x;
          rs.midY = point.y;
          rs.midVector = [point.y - nextPoint.y, nextPoint.x - point.x];
        } else { // On rounded points
          let v = [
            point.x - corner.cx,
            point.y - corner.cy
          ];

          const factor = corner.radius / Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2));

          v = v.map(c => c * factor);

          rs.midX = corner.cx + v[0];
          rs.midY = corner.cy + v[1];
          rs.midVector = v;
        }
      }
    }


  }
};

BRp.checkForInvalidEdgeWarning = function( edge ){
  let rs = edge[0]._private.rscratch;

  if( rs.nodesOverlap || (is.number(rs.startX) && is.number(rs.startY) && is.number(rs.endX) && is.number(rs.endY)) ){
    rs.loggedErr = false;
  } else {
    if( !rs.loggedErr ){
      rs.loggedErr = true;
      util.warn('Edge `' + edge.id() + '` has invalid endpoints and so it is impossible to draw.  Adjust your edge style (e.g. control points) accordingly or use an alternative edge type.  This is expected behaviour when the source node and the target node overlap.');
    }
  }
};

BRp.findEdgeControlPoints = function( edges ){
  if( !edges || edges.length === 0 ){ return; }

  let r = this;
  let cy = r.cy;
  let hasCompounds = cy.hasCompoundNodes();

  let hashTable = new Map();
  let getKey = (pairId, edgeIsUnbundled) => [
    ...pairId,
    edgeIsUnbundled ? 1 : 0
  ].join('-');

  let pairIds = [];
  let haystackEdges = [];

  // create a table of edge (src, tgt) => list of edges between them
  for( let i = 0; i < edges.length; i++ ){
    let edge = edges[i];
    let _p = edge._private;
    let curveStyle = edge.pstyle('curve-style').value;

    // ignore edges who are not to be displayed
    // they shouldn't take up space
    if( edge.removed() || !edge.takesUpSpace() ){
      continue;
    }

    if( curveStyle === 'haystack' ){
      haystackEdges.push( edge );
      continue;
    }

    let edgeIsUnbundled = curveStyle === 'unbundled-bezier' || endsWith(curveStyle, 'segments') || curveStyle === 'straight' || curveStyle === 'straight-triangle' || endsWith(curveStyle, 'taxi');
    let edgeIsBezier = curveStyle === 'unbundled-bezier' || curveStyle === 'bezier';
    let src = _p.source;
    let tgt = _p.target;
    let srcIndex = src.poolIndex();
    let tgtIndex = tgt.poolIndex();

    let pairId = [ srcIndex, tgtIndex ].sort();
    let key = getKey(pairId, edgeIsUnbundled);

    let tableEntry = hashTable.get( key );

    if( tableEntry == null ){
      tableEntry = { eles: [] };

      pairIds.push({ pairId, edgeIsUnbundled });
      hashTable.set( key, tableEntry );
    }

    tableEntry.eles.push( edge );

    if( edgeIsUnbundled ){
      tableEntry.hasUnbundled = true;
    }

    if( edgeIsBezier ){
      tableEntry.hasBezier = true;
    }
  }

  // for each pair (src, tgt), create the ctrl pts
  // Nested for loop is OK; total number of iterations for both loops = edgeCount
  for( let p = 0; p < pairIds.length; p++ ){
    let { pairId, edgeIsUnbundled } = pairIds[ p ];
    let key = getKey(pairId, edgeIsUnbundled);
    let pairInfo = hashTable.get( key );
    let swappedpairInfo;

    if( !pairInfo.hasUnbundled ){
      let pllEdges = pairInfo.eles[0].parallelEdges().filter(e => e.isBundledBezier());

      util.clearArray( pairInfo.eles );

      pllEdges.forEach( edge => pairInfo.eles.push(edge) );

      // for each pair id, the edges should be sorted by index
      pairInfo.eles.sort( (edge1, edge2) => edge1.poolIndex() - edge2.poolIndex() );
    }

    let firstEdge = pairInfo.eles[0];
    let src = firstEdge.source();
    let tgt = firstEdge.target();

    // make sure src/tgt distinction is consistent w.r.t. pairId
    if( src.poolIndex() > tgt.poolIndex() ){
      let temp = src;
      src = tgt;
      tgt = temp;
    }

    let srcPos = pairInfo.srcPos = src.position();
    let tgtPos = pairInfo.tgtPos = tgt.position();

    let srcW = pairInfo.srcW = src.outerWidth();
    let srcH = pairInfo.srcH = src.outerHeight();

    let tgtW = pairInfo.tgtW = tgt.outerWidth();
    let tgtH = pairInfo.tgtH = tgt.outerHeight();

    let srcShape = pairInfo.srcShape = r.nodeShapes[ this.getNodeShape( src ) ];
    let tgtShape = pairInfo.tgtShape = r.nodeShapes[ this.getNodeShape( tgt ) ];

    let srcCornerRadius = pairInfo.srcCornerRadius = src.pstyle('corner-radius').value === 'auto' ? 'auto' : src.pstyle('corner-radius').pfValue;
    let tgtCornerRadius = pairInfo.tgtCornerRadius = tgt.pstyle('corner-radius').value === 'auto' ? 'auto' : tgt.pstyle('corner-radius').pfValue;

    let tgtRs = pairInfo.tgtRs = tgt._private.rscratch;
    let srcRs = pairInfo.srcRs = src._private.rscratch;

    pairInfo.dirCounts = {
      'north': 0,
      'west': 0,
      'south': 0,
      'east': 0,
      'northwest': 0,
      'southwest': 0,
      'northeast': 0,
      'southeast': 0
    };

    for( let i = 0; i < pairInfo.eles.length; i++ ){
      const edge = pairInfo.eles[i];
      const rs = edge[0]._private.rscratch;
      const curveStyle = edge.pstyle( 'curve-style' ).value;
      const edgeIsUnbundled = curveStyle === 'unbundled-bezier' || endsWith(curveStyle, 'segments') || endsWith(curveStyle, 'taxi');

      // whether the normalised pair order is the reverse of the edge's src-tgt order
      const edgeIsSwapped = !src.same(edge.source());

      if( !pairInfo.calculatedIntersection && src !== tgt && ( pairInfo.hasBezier || pairInfo.hasUnbundled ) ){
        pairInfo.calculatedIntersection = true;

        // pt outside src shape to calc distance/displacement from src to tgt
        let srcOutside = srcShape.intersectLine(
          srcPos.x, srcPos.y,
          srcW, srcH,
          tgtPos.x, tgtPos.y,
          0, srcCornerRadius, srcRs
        );

        let srcIntn = pairInfo.srcIntn = srcOutside;

        // pt outside tgt shape to calc distance/displacement from src to tgt
        let tgtOutside = tgtShape.intersectLine(
          tgtPos.x, tgtPos.y,
          tgtW, tgtH,
          srcPos.x, srcPos.y,
          0, tgtCornerRadius, tgtRs
        );

        let tgtIntn = pairInfo.tgtIntn = tgtOutside;

        let intersectionPts = pairInfo.intersectionPts = {
          x1: srcOutside[0],
          x2: tgtOutside[0],
          y1: srcOutside[1],
          y2: tgtOutside[1]
        };

        let posPts = pairInfo.posPts = {
          x1: srcPos.x,
          x2: tgtPos.x,
          y1: srcPos.y,
          y2: tgtPos.y
        };

        let dy = ( tgtOutside[1] - srcOutside[1] );
        let dx = ( tgtOutside[0] - srcOutside[0] );
        let l = Math.sqrt(
          (dx * dx) +
          (dy * dy)
        );

        if (is.number(l) && l >= AVOID_IMPOSSIBLE_BEZIER_CONSTANT_L) {
          // keep l
        } else {
          l = Math.sqrt(
            Math.max(dx * dx, AVOID_IMPOSSIBLE_BEZIER_CONSTANT) +
            Math.max(dy * dy, AVOID_IMPOSSIBLE_BEZIER_CONSTANT)
          );
        }

        let vector = pairInfo.vector = {
          x: dx,
          y: dy
        };

        let vectorNorm = pairInfo.vectorNorm = {
          x: vector.x / l,
          y: vector.y / l
        };

        let vectorNormInverse = {
          x: -vectorNorm.y,
          y: vectorNorm.x
        };

        // if node shapes overlap, then no ctrl pts to draw
        pairInfo.nodesOverlap = (
          !is.number(l)
          || tgtShape.checkPoint( srcOutside[0], srcOutside[1], 0, tgtW, tgtH, tgtPos.x, tgtPos.y, tgtCornerRadius, tgtRs )
          || srcShape.checkPoint( tgtOutside[0], tgtOutside[1], 0, srcW, srcH, srcPos.x, srcPos.y, srcCornerRadius, srcRs )
        );

        pairInfo.vectorNormInverse = vectorNormInverse;

        swappedpairInfo = {
          nodesOverlap: pairInfo.nodesOverlap,
          dirCounts: pairInfo.dirCounts,
          calculatedIntersection: true,
          hasBezier: pairInfo.hasBezier,
          hasUnbundled: pairInfo.hasUnbundled,
          eles: pairInfo.eles,
          srcPos: tgtPos,
          srcRs: tgtRs,
          tgtPos: srcPos,
          tgtRs: srcRs,
          srcW: tgtW,
          srcH: tgtH,
          tgtW: srcW,
          tgtH: srcH,
          srcIntn: tgtIntn,
          tgtIntn: srcIntn,
          srcShape: tgtShape,
          tgtShape: srcShape,
          posPts: {
            x1: posPts.x2, y1: posPts.y2,
            x2: posPts.x1, y2: posPts.y1
          },
          intersectionPts: {
            x1: intersectionPts.x2, y1: intersectionPts.y2,
            x2: intersectionPts.x1, y2: intersectionPts.y1
          },
          vector: { x: -vector.x, y: -vector.y },
          vectorNorm: { x: -vectorNorm.x, y: -vectorNorm.y },
          vectorNormInverse: { x: -vectorNormInverse.x, y: -vectorNormInverse.y }
        };
      }

      const passedPairInfo = edgeIsSwapped ? swappedpairInfo : pairInfo;

      rs.nodesOverlap = passedPairInfo.nodesOverlap;
      rs.srcIntn = passedPairInfo.srcIntn;
      rs.tgtIntn = passedPairInfo.tgtIntn;

      rs.isRound = curveStyle.startsWith('round');

      if(
        hasCompounds &&
        ( src.isParent() || src.isChild() || tgt.isParent() || tgt.isChild() ) &&
        ( src.parents().anySame(tgt) || tgt.parents().anySame(src) || (src.same(tgt) && src.isParent()) )
      ){
        this.findCompoundLoopPoints(edge, passedPairInfo, i, edgeIsUnbundled);

      } else if( src === tgt ){
        this.findLoopPoints(edge, passedPairInfo, i, edgeIsUnbundled);

      } else if( curveStyle.endsWith( 'segments' )){
        this.findSegmentsPoints(edge, passedPairInfo);

      } else if( curveStyle.endsWith( 'taxi' )){
        this.findTaxiPoints(edge, passedPairInfo);

      } else if(
        curveStyle === 'straight'
        || (
          !edgeIsUnbundled
          && pairInfo.eles.length % 2 === 1
          && i === Math.floor( pairInfo.eles.length / 2 )
        )
      ){
        this.findStraightEdgePoints(edge);

      } else {
        this.findBezierPoints(edge, passedPairInfo, i, edgeIsUnbundled, edgeIsSwapped);
      }

      this.findEndpoints( edge );

      this.tryToCorrectInvalidPoints( edge, passedPairInfo );

      this.checkForInvalidEdgeWarning( edge );

      this.storeAllpts( edge );
      this.storeEdgeProjections( edge );
      this.calculateArrowAngles( edge );
      this.recalculateEdgeLabelProjections( edge );
      this.calculateLabelAngles( edge );
    } // for pair edges
  } // for pair ids

  // haystacks avoid the expense of pairInfo stuff (intersections etc.)
  this.findHaystackPoints( haystackEdges );
};

function getPts( pts ){
  let retPts = [];

  if( pts == null ){ return; }

  for( let i = 0; i < pts.length; i += 2 ){
    let x = pts[i];
    let y = pts[i+1];

    retPts.push({ x, y });
  }

  return retPts;
}

BRp.getSegmentPoints = function( edge ){
  let rs = edge[0]._private.rscratch;

  this.recalculateRenderedStyle( edge );

  let type = rs.edgeType;
  if( type === 'segments' ){
    return getPts( rs.segpts );
  }
};

BRp.getControlPoints = function( edge ){
  let rs = edge[0]._private.rscratch;

  this.recalculateRenderedStyle( edge );

  let type = rs.edgeType;
  if( type === 'bezier' || type === 'multibezier' || type === 'self' || type === 'compound' ){
    return getPts( rs.ctrlpts );
  }
};

BRp.getEdgeMidpoint = function( edge ){
  let rs = edge[0]._private.rscratch;

  this.recalculateRenderedStyle( edge );

  return {
    x: rs.midX,
    y: rs.midY
  };
};

export default BRp;
