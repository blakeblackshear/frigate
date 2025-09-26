import * as math from '../../../../math.mjs';

var BRp = {};

BRp.calculateArrowAngles = function( edge ){
  var rs = edge._private.rscratch;
  var isHaystack = rs.edgeType === 'haystack';
  var isBezier = rs.edgeType === 'bezier';
  var isMultibezier = rs.edgeType === 'multibezier';
  var isSegments = rs.edgeType === 'segments';
  var isCompound = rs.edgeType === 'compound';
  var isSelf = rs.edgeType === 'self';

  // Displacement gives direction for arrowhead orientation
  var dispX, dispY;
  var startX, startY, endX, endY, midX, midY;

  if( isHaystack ){
    startX = rs.haystackPts[0];
    startY = rs.haystackPts[1];
    endX = rs.haystackPts[2];
    endY = rs.haystackPts[3];
  } else {
    startX = rs.arrowStartX;
    startY = rs.arrowStartY;
    endX = rs.arrowEndX;
    endY = rs.arrowEndY;
  }

  midX = rs.midX;
  midY = rs.midY;

  // source
  //

  if( isSegments ){
    dispX = startX - rs.segpts[0];
    dispY = startY - rs.segpts[1];
  } else if( isMultibezier || isCompound || isSelf || isBezier ){
    var pts = rs.allpts;
    var bX = math.qbezierAt( pts[0], pts[2], pts[4], 0.1 );
    var bY = math.qbezierAt( pts[1], pts[3], pts[5], 0.1 );

    dispX = startX - bX;
    dispY = startY - bY;
  } else {
    dispX = startX - midX;
    dispY = startY - midY;
  }

  rs.srcArrowAngle = math.getAngleFromDisp( dispX, dispY );

  // mid target
  //

  var midX = rs.midX;
  var midY = rs.midY;

  if( isHaystack ){
    midX = ( startX + endX ) / 2;
    midY = ( startY + endY ) / 2;
  }

  dispX = endX - startX;
  dispY = endY - startY;

  if( isSegments ){
    var pts = rs.allpts;

    if( pts.length / 2 % 2 === 0 ){
      var i2 = pts.length / 2;
      var i1 = i2 - 2;

      dispX = ( pts[ i2 ] - pts[ i1 ] );
      dispY = ( pts[ i2 + 1] - pts[ i1 + 1] );
    } else if( rs.isRound ){
     dispX = rs.midVector[1];
     dispY = -rs.midVector[0];
    } else {
      var i2 = pts.length / 2 - 1;
      var i1 = i2 - 2;

      dispX = ( pts[ i2 ] - pts[ i1 ] );
      dispY = ( pts[ i2 + 1] - pts[ i1 + 1] );
    }
  } else if( isMultibezier || isCompound || isSelf ){
    var pts = rs.allpts;
    var cpts = rs.ctrlpts;
    var bp0x, bp0y;
    var bp1x, bp1y;

    if( cpts.length / 2 % 2 === 0 ){
      var p0 = pts.length / 2 - 1; // startpt
      var ic = p0 + 2;
      var p1 = ic + 2;

      bp0x = math.qbezierAt( pts[ p0 ], pts[ ic ], pts[ p1 ], 0.0 );
      bp0y = math.qbezierAt( pts[ p0 + 1], pts[ ic + 1], pts[ p1 + 1], 0.0 );

      bp1x = math.qbezierAt( pts[ p0 ], pts[ ic ], pts[ p1 ], 0.0001 );
      bp1y = math.qbezierAt( pts[ p0 + 1], pts[ ic + 1], pts[ p1 + 1], 0.0001 );
    } else {
      var ic = pts.length / 2 - 1; // ctrpt
      var p0 = ic - 2; // startpt
      var p1 = ic + 2; // endpt

      bp0x = math.qbezierAt( pts[ p0 ], pts[ ic ], pts[ p1 ], 0.4999 );
      bp0y = math.qbezierAt( pts[ p0 + 1], pts[ ic + 1], pts[ p1 + 1], 0.4999 );

      bp1x = math.qbezierAt( pts[ p0 ], pts[ ic ], pts[ p1 ], 0.5 );
      bp1y = math.qbezierAt( pts[ p0 + 1], pts[ ic + 1], pts[ p1 + 1], 0.5 );
    }

    dispX = ( bp1x - bp0x );
    dispY = ( bp1y - bp0y );
  }

  rs.midtgtArrowAngle = math.getAngleFromDisp( dispX, dispY );

  rs.midDispX = dispX;
  rs.midDispY = dispY;

  // mid source
  //

  dispX *= -1;
  dispY *= -1;

  if( isSegments ){
    var pts = rs.allpts;

    if( pts.length / 2 % 2 === 0 ){
      // already ok
    } else if( !rs.isRound ){
      var i2 = pts.length / 2 - 1;
      var i3 = i2 + 2;

      dispX = -( pts[ i3 ] - pts[ i2 ] );
      dispY = -( pts[ i3 + 1] - pts[ i2 + 1] );
    }
  }

  rs.midsrcArrowAngle = math.getAngleFromDisp( dispX, dispY );

  // target
  //

  if( isSegments ){
    dispX = endX - rs.segpts[ rs.segpts.length - 2 ];
    dispY = endY - rs.segpts[ rs.segpts.length - 1 ];
  } else if( isMultibezier || isCompound || isSelf || isBezier ){
    var pts = rs.allpts;
    var l = pts.length;
    var bX = math.qbezierAt( pts[l-6], pts[l-4], pts[l-2], 0.9 );
    var bY = math.qbezierAt( pts[l-5], pts[l-3], pts[l-1], 0.9 );

    dispX = endX - bX;
    dispY = endY - bY;
  } else {
    dispX = endX - midX;
    dispY = endY - midY;
  }

  rs.tgtArrowAngle = math.getAngleFromDisp( dispX, dispY );
};

BRp.getArrowWidth = BRp.getArrowHeight = function( edgeWidth, scale ){
  var cache = this.arrowWidthCache = this.arrowWidthCache || {};

  var cachedVal = cache[ edgeWidth + ', ' + scale ];
  if( cachedVal ){
    return cachedVal;
  }

  cachedVal =  Math.max( Math.pow( edgeWidth * 13.37, 0.9 ), 29 ) * scale;
  cache[ edgeWidth + ', ' + scale ] = cachedVal;

  return cachedVal;
};

export default BRp;
