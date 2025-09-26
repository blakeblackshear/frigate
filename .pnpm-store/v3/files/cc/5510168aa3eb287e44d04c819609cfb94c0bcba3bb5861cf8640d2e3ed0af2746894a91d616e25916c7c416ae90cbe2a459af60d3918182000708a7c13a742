import * as math from '../../../math.mjs';
import * as round from "../../../round.mjs";

var BRp = {};

BRp.generatePolygon = function( name, points ){
  return ( this.nodeShapes[ name ] = {
    renderer: this,

    name: name,

    points: points,

    draw: function( context, centerX, centerY, width, height, cornerRadius ){
      this.renderer.nodeShapeImpl( 'polygon', context, centerX, centerY, width, height, this.points );
    },

    intersectLine: function( nodeX, nodeY, width, height, x, y, padding, cornerRadius ){
      return math.polygonIntersectLine(
          x, y,
          this.points,
          nodeX,
          nodeY,
          width / 2, height / 2,
          padding )
        ;
    },

    checkPoint: function( x, y, padding, width, height, centerX, centerY, cornerRadius ){
      return math.pointInsidePolygon( x, y, this.points,
        centerX, centerY, width, height, [0, -1], padding )
      ;
    },

    hasMiterBounds: name !== 'rectangle',

    miterBounds: function( centerX, centerY, width, height, strokeWidth, strokePosition ){
      return math.miterBox( this.points, centerX, centerY, width, height, strokeWidth, strokePosition );
    }
  } );
};

BRp.generateEllipse = function(){
  return ( this.nodeShapes['ellipse'] = {
    renderer: this,

    name: 'ellipse',

    draw: function( context, centerX, centerY, width, height, cornerRadius ){
      this.renderer.nodeShapeImpl( this.name, context, centerX, centerY, width, height );
    },

    intersectLine: function( nodeX, nodeY, width, height, x, y, padding, cornerRadius ){
      return math.intersectLineEllipse(
        x, y,
        nodeX,
        nodeY,
        width / 2 + padding,
        height / 2 + padding )
      ;
    },

    checkPoint: function( x, y, padding, width, height, centerX, centerY, cornerRadius ){
      return math.checkInEllipse( x, y, width, height, centerX, centerY, padding );
    }
  } );
};

BRp.generateRoundPolygon = function( name, points ){

  return ( this.nodeShapes[ name ] = {
    renderer: this,

    name: name,

    points: points,

    getOrCreateCorners: function (centerX, centerY, width, height, cornerRadius, rs, field) {
      if( rs[field] !== undefined && rs[field + '-cx'] === centerX && rs [field + '-cy'] === centerY ){
        return rs[field];
      }

      rs[field] = new Array( points.length / 2 );
      rs[field + '-cx'] = centerX;
      rs[field + '-cy'] = centerY;
      const halfW = width / 2;
      const halfH = height / 2;
      cornerRadius = cornerRadius === 'auto' ? math.getRoundPolygonRadius( width, height ) : cornerRadius;
      const p = new Array( points.length / 2 );

      for ( let i = 0; i < points.length / 2; i++ ){
        p[i] = {
          x: centerX + halfW * points[ i * 2 ],
          y: centerY + halfH * points[ i * 2 + 1 ]
        };
      }

      let i, p1, p2, p3, len = p.length;

      p1 = p[ len - 1 ];
      // for each point
      for( i = 0; i < len; i++ ){
        p2 = p[ (i) % len ];
        p3 = p[ (i + 1) % len ];
        rs[ field ][ i ] = round.getRoundCorner( p1, p2, p3, cornerRadius );

        p1 = p2;
        p2 = p3;
      }

      return rs[ field ];
    },

    draw: function( context, centerX, centerY, width, height, cornerRadius , rs){
      this.renderer.nodeShapeImpl( 'round-polygon', context, centerX, centerY, width, height, this.points, this.getOrCreateCorners( centerX, centerY, width, height, cornerRadius, rs, 'drawCorners' ));
    },

    intersectLine: function( nodeX, nodeY, width, height, x, y, padding, cornerRadius, rs ){
        return math.roundPolygonIntersectLine(
          x, y,
          this.points,
          nodeX,
          nodeY,
          width, height,
          padding, this.getOrCreateCorners( nodeX, nodeY, width, height, cornerRadius, rs, 'corners' ) )
          ;
    },

    checkPoint: function( x, y, padding, width, height, centerX, centerY, cornerRadius, rs ){
      return math.pointInsideRoundPolygon( x, y, this.points,
          centerX, centerY, width, height, this.getOrCreateCorners( centerX, centerY, width, height, cornerRadius, rs, 'corners' ) )
          ;
    }
  } );
};

BRp.generateRoundRectangle = function(){
  return ( this.nodeShapes['round-rectangle'] = this.nodeShapes['roundrectangle'] = {
    renderer: this,

    name: 'round-rectangle',

    points: math.generateUnitNgonPointsFitToSquare( 4, 0 ),

    draw: function( context, centerX, centerY, width, height, cornerRadius ){
      this.renderer.nodeShapeImpl( this.name, context, centerX, centerY, width, height, this.points, cornerRadius );
    },

    intersectLine: function( nodeX, nodeY, width, height, x, y, padding, cornerRadius ){
      return math.roundRectangleIntersectLine(
        x, y,
        nodeX,
        nodeY,
        width, height,
        padding, cornerRadius )
      ;
    },

    checkPoint: function(
      x, y, padding, width, height, centerX, centerY, cornerRadius ){
      let halfWidth = width / 2;
      let halfHeight = height / 2;
      cornerRadius = cornerRadius === 'auto' ? math.getRoundRectangleRadius( width, height ) : cornerRadius;
      cornerRadius = Math.min(halfWidth, halfHeight, cornerRadius);
      var diam = cornerRadius * 2;

      // Check hBox
      if( math.pointInsidePolygon( x, y, this.points,
        centerX, centerY, width, height - diam, [0, -1], padding ) ){
        return true;
      }

      // Check vBox
      if( math.pointInsidePolygon( x, y, this.points,
        centerX, centerY, width - diam, height, [0, -1], padding ) ){
        return true;
      }

      // Check top left quarter circle
      if( math.checkInEllipse( x, y,
        diam, diam,
        centerX - halfWidth + cornerRadius,
        centerY - halfHeight + cornerRadius,
        padding ) ){

        return true;
      }

      // Check top right quarter circle
      if( math.checkInEllipse( x, y,
        diam, diam,
        centerX + halfWidth - cornerRadius,
        centerY - halfHeight + cornerRadius,
        padding ) ){

        return true;
      }

      // Check bottom right quarter circle
      if( math.checkInEllipse( x, y,
        diam, diam,
        centerX + halfWidth - cornerRadius,
        centerY + halfHeight - cornerRadius,
        padding ) ){

        return true;
      }

      // Check bottom left quarter circle
      if( math.checkInEllipse( x, y,
        diam, diam,
        centerX - halfWidth + cornerRadius,
        centerY + halfHeight - cornerRadius,
        padding ) ){

        return true;
      }

      return false;
    }
  } );
};

BRp.generateCutRectangle = function(){
  return ( this.nodeShapes['cut-rectangle'] = this.nodeShapes['cutrectangle'] = {
    renderer: this,

    name: 'cut-rectangle',

    cornerLength: math.getCutRectangleCornerLength(),

    points: math.generateUnitNgonPointsFitToSquare( 4, 0 ),

    draw: function( context, centerX, centerY, width, height, cornerRadius ){
      this.renderer.nodeShapeImpl( this.name, context, centerX, centerY, width, height, null, cornerRadius);
    },

    generateCutTrianglePts: function( width, height, centerX, centerY, cornerRadius ){
      var cl = cornerRadius === 'auto' ? this.cornerLength : cornerRadius;
      var hh = height / 2;
      var hw = width / 2;
      var xBegin = centerX - hw;
      var xEnd = centerX + hw;
      var yBegin = centerY - hh;
      var yEnd = centerY + hh;

      // points are in clockwise order, inner (imaginary) triangle pt on [4, 5]
      return {
        topLeft: [ xBegin, yBegin + cl, xBegin + cl, yBegin, xBegin + cl, yBegin + cl ],
        topRight: [ xEnd - cl, yBegin, xEnd, yBegin + cl, xEnd - cl, yBegin + cl ],
        bottomRight: [ xEnd, yEnd - cl, xEnd - cl, yEnd, xEnd - cl, yEnd - cl ],
        bottomLeft: [ xBegin + cl, yEnd, xBegin, yEnd - cl, xBegin + cl, yEnd - cl ]
      };
    },

    intersectLine: function( nodeX, nodeY, width, height, x, y, padding, cornerRadius ){
      var cPts = this.generateCutTrianglePts( width + 2*padding, height+2*padding, nodeX, nodeY, cornerRadius );
      var pts = [].concat.apply([],
       [cPts.topLeft.splice(0, 4), cPts.topRight.splice(0, 4),
         cPts.bottomRight.splice(0, 4), cPts.bottomLeft.splice(0, 4)
       ]);

      return math.polygonIntersectLine( x, y, pts, nodeX, nodeY );
    },

    checkPoint: function( x, y, padding, width, height, centerX, centerY, cornerRadius ){
      const cl = cornerRadius === 'auto' ? this.cornerLength : cornerRadius;
      // Check hBox
      if( math.pointInsidePolygon( x, y, this.points,
        centerX, centerY, width, height - 2 * cl, [0, -1], padding ) ){
        return true;
      }

      // Check vBox
      if( math.pointInsidePolygon( x, y, this.points,
        centerX, centerY, width - 2 * cl, height, [0, -1], padding ) ){
        return true;
      }
      var cutTrianglePts = this.generateCutTrianglePts(width, height, centerX, centerY);
      return math.pointInsidePolygonPoints( x, y, cutTrianglePts.topLeft)
       || math.pointInsidePolygonPoints( x, y, cutTrianglePts.topRight )
       || math.pointInsidePolygonPoints( x, y, cutTrianglePts.bottomRight )
       || math.pointInsidePolygonPoints( x, y, cutTrianglePts.bottomLeft );
    }

  } );
};

BRp.generateBarrel = function(){
  return ( this.nodeShapes['barrel'] = {
    renderer: this,

    name: 'barrel',

    points: math.generateUnitNgonPointsFitToSquare( 4, 0 ),

    draw: function( context, centerX, centerY, width, height, cornerRadius ){
      this.renderer.nodeShapeImpl( this.name, context, centerX, centerY, width, height );
    },

    intersectLine: function( nodeX, nodeY, width, height, x, y, padding, cornerRadius ){
      // use two fixed t values for the bezier curve approximation

      var t0 = 0.15;
      var t1 = 0.5;
      var t2 = 0.85;

      var bPts = this.generateBarrelBezierPts( width + 2*padding, height + 2*padding, nodeX, nodeY );

      var approximateBarrelCurvePts = pts => {
        // approximate curve pts based on the two t values
        var m0 = math.qbezierPtAt({x: pts[0], y: pts[1]}, {x: pts[2], y: pts[3]}, {x: pts[4], y: pts[5]}, t0);
        var m1 = math.qbezierPtAt({x: pts[0], y: pts[1]}, {x: pts[2], y: pts[3]}, {x: pts[4], y: pts[5]}, t1);
        var m2 = math.qbezierPtAt({x: pts[0], y: pts[1]}, {x: pts[2], y: pts[3]}, {x: pts[4], y: pts[5]}, t2);

        return [
          pts[0],pts[1],
          m0.x, m0.y,
          m1.x, m1.y,
          m2.x, m2.y,
          pts[4], pts[5]
        ];
      };

      var pts = [].concat(
        approximateBarrelCurvePts(bPts.topLeft),
        approximateBarrelCurvePts(bPts.topRight),
        approximateBarrelCurvePts(bPts.bottomRight),
        approximateBarrelCurvePts(bPts.bottomLeft)
      );

      return math.polygonIntersectLine( x, y, pts, nodeX, nodeY );
    },

    generateBarrelBezierPts: function( width, height, centerX, centerY ){
      var hh = height / 2;
      var hw = width / 2;
      var xBegin = centerX - hw;
      var xEnd = centerX + hw;
      var yBegin = centerY - hh;
      var yEnd = centerY + hh;

      var curveConstants = math.getBarrelCurveConstants( width, height );
      var hOffset = curveConstants.heightOffset;
      var wOffset = curveConstants.widthOffset;
      var ctrlPtXOffset = curveConstants.ctrlPtOffsetPct * width;

      // points are in clockwise order, inner (imaginary) control pt on [4, 5]
      var pts = {
        topLeft: [ xBegin, yBegin + hOffset, xBegin + ctrlPtXOffset, yBegin, xBegin + wOffset, yBegin ],
        topRight: [ xEnd - wOffset, yBegin, xEnd - ctrlPtXOffset, yBegin, xEnd, yBegin + hOffset ],
        bottomRight: [ xEnd, yEnd - hOffset, xEnd - ctrlPtXOffset, yEnd, xEnd - wOffset, yEnd ],
        bottomLeft: [ xBegin + wOffset, yEnd, xBegin + ctrlPtXOffset, yEnd, xBegin, yEnd - hOffset ]
      };

      pts.topLeft.isTop = true;
      pts.topRight.isTop = true;
      pts.bottomLeft.isBottom = true;
      pts.bottomRight.isBottom = true;

      return pts;
    },

    checkPoint: function(
      x, y, padding, width, height, centerX, centerY, cornerRadius){

      var curveConstants = math.getBarrelCurveConstants( width, height );
      var hOffset = curveConstants.heightOffset;
      var wOffset = curveConstants.widthOffset;

      // Check hBox
      if( math.pointInsidePolygon( x, y, this.points,
        centerX, centerY, width, height - 2 *  hOffset, [0, -1], padding ) ){
        return true;
      }

      // Check vBox
      if( math.pointInsidePolygon( x, y, this.points,
        centerX, centerY, width - 2 * wOffset, height, [0, -1], padding ) ){
        return true;
      }

      var barrelCurvePts = this.generateBarrelBezierPts( width, height, centerX, centerY );

      var getCurveT = function (x, y, curvePts) {
        var x0 = curvePts[ 4 ];
        var x1 = curvePts[ 2 ];
        var x2 = curvePts[ 0 ];
        var y0 = curvePts[ 5 ];
        // var y1 = curvePts[ 3 ];
        var y2 = curvePts[ 1 ];

        var xMin = Math.min( x0, x2 );
        var xMax = Math.max( x0, x2 );
        var yMin = Math.min( y0, y2 );
        var yMax = Math.max( y0, y2 );

        if( xMin <= x && x <= xMax  && yMin <= y && y <= yMax ){
          var coeff = math.bezierPtsToQuadCoeff( x0, x1, x2 );
          var roots = math.solveQuadratic( coeff[0], coeff[1], coeff[2], x );

          var validRoots = roots.filter(function( r ){
            return 0 <= r && r <= 1;
          });

          if( validRoots.length > 0 ){
            return validRoots[ 0 ];
          }
        }
        return null;
      };

      var curveRegions = Object.keys( barrelCurvePts );
      for( var i = 0; i < curveRegions.length; i++ ){
        var corner = curveRegions[ i ];
        var cornerPts = barrelCurvePts[ corner ];
        var t = getCurveT( x, y, cornerPts );

        if( t == null ){ continue; }

        var y0 = cornerPts[ 5 ];
        var y1 = cornerPts[ 3 ];
        var y2 = cornerPts[ 1 ];
        var bezY = math.qbezierAt( y0, y1, y2, t );

        if( cornerPts.isTop && bezY <= y ){
          return true;
        }
        if( cornerPts.isBottom && y <= bezY ){
          return true;
        }
      }
      return false;
    }
  } );
};

BRp.generateBottomRoundrectangle = function(){
  return ( this.nodeShapes['bottom-round-rectangle'] = this.nodeShapes['bottomroundrectangle'] = {
    renderer: this,

    name: 'bottom-round-rectangle',

    points: math.generateUnitNgonPointsFitToSquare( 4, 0 ),

    draw: function( context, centerX, centerY, width, height, cornerRadius ){
      this.renderer.nodeShapeImpl( this.name, context, centerX, centerY, width, height, this.points, cornerRadius );
    },

    intersectLine: function( nodeX, nodeY, width, height, x, y, padding, cornerRadius ){
      var topStartX = nodeX - ( width / 2 + padding );
      var topStartY = nodeY - ( height / 2 + padding );
      var topEndY = topStartY;
      var topEndX = nodeX + ( width / 2 + padding );

      var topIntersections = math.finiteLinesIntersect(
        x, y, nodeX, nodeY, topStartX, topStartY, topEndX, topEndY, false );
      if( topIntersections.length > 0 ){
        return topIntersections;
      }

      return math.roundRectangleIntersectLine(
        x, y,
        nodeX,
        nodeY,
        width, height,
        padding, cornerRadius )
      ;
    },

    checkPoint: function(
      x, y, padding, width, height, centerX, centerY, cornerRadius ){

      cornerRadius = cornerRadius === 'auto' ? math.getRoundRectangleRadius( width, height ) : cornerRadius;
      var diam = 2 * cornerRadius;

      // Check hBox
      if( math.pointInsidePolygon( x, y, this.points,
        centerX, centerY, width, height - diam, [0, -1], padding ) ){
        return true;
      }

      // Check vBox
      if( math.pointInsidePolygon( x, y, this.points,
        centerX, centerY, width - diam, height, [0, -1], padding ) ){
        return true;
      }

      // check non-rounded top side
      var outerWidth = ( ( width / 2 ) + 2 * padding );
      var outerHeight = ( ( height / 2 ) + 2 * padding );
      var points = [
        centerX - outerWidth, centerY - outerHeight,
        centerX - outerWidth, centerY,
        centerX + outerWidth, centerY,
        centerX + outerWidth, centerY - outerHeight
      ];
      if( math.pointInsidePolygonPoints( x, y, points) ){
        return true;
      }

      // Check bottom right quarter circle
      if( math.checkInEllipse( x, y,
        diam, diam,
        centerX + width / 2 - cornerRadius,
        centerY + height / 2 - cornerRadius,
        padding ) ){

        return true;
      }

      // Check bottom left quarter circle
      if( math.checkInEllipse( x, y,
        diam, diam,
        centerX - width / 2 + cornerRadius,
        centerY + height / 2 - cornerRadius,
        padding ) ){

        return true;
      }

      return false;
    }
  } );
};


BRp.registerNodeShapes = function(){
  var nodeShapes = this.nodeShapes = {};
  var renderer = this;

  this.generateEllipse();

  this.generatePolygon( 'triangle', math.generateUnitNgonPointsFitToSquare( 3, 0 ) );
  this.generateRoundPolygon( 'round-triangle', math.generateUnitNgonPointsFitToSquare( 3, 0 ) );

  this.generatePolygon( 'rectangle', math.generateUnitNgonPointsFitToSquare( 4, 0 ) );
  nodeShapes[ 'square' ] = nodeShapes[ 'rectangle' ];

  this.generateRoundRectangle();

  this.generateCutRectangle();

  this.generateBarrel();

  this.generateBottomRoundrectangle();

  {
    const diamondPoints = [
      0, 1,
      1, 0,
      0, -1,
      -1, 0
    ];
    this.generatePolygon( 'diamond', diamondPoints );
    this.generateRoundPolygon( 'round-diamond', diamondPoints );
  }

  this.generatePolygon( 'pentagon', math.generateUnitNgonPointsFitToSquare( 5, 0 ) );
  this.generateRoundPolygon( 'round-pentagon', math.generateUnitNgonPointsFitToSquare( 5, 0) );

  this.generatePolygon( 'hexagon', math.generateUnitNgonPointsFitToSquare( 6, 0 ) );
  this.generateRoundPolygon( 'round-hexagon', math.generateUnitNgonPointsFitToSquare( 6, 0) );

  this.generatePolygon( 'heptagon', math.generateUnitNgonPointsFitToSquare( 7, 0 ) );
  this.generateRoundPolygon( 'round-heptagon', math.generateUnitNgonPointsFitToSquare( 7, 0) );

  this.generatePolygon( 'octagon', math.generateUnitNgonPointsFitToSquare( 8, 0 ) );
  this.generateRoundPolygon( 'round-octagon', math.generateUnitNgonPointsFitToSquare( 8, 0) );

  var star5Points = new Array( 20 );
  {
    var outerPoints = math.generateUnitNgonPoints( 5, 0 );
    var innerPoints = math.generateUnitNgonPoints( 5, Math.PI / 5 );

    // Outer radius is 1; inner radius of star is smaller
    var innerRadius = 0.5 * (3 - Math.sqrt( 5 ));
    innerRadius *= 1.57;

    for( var i = 0;i < innerPoints.length / 2;i++ ){
      innerPoints[ i * 2] *= innerRadius;
      innerPoints[ i * 2 + 1] *= innerRadius;
    }

    for( var i = 0;i < 20 / 4;i++ ){
      star5Points[ i * 4] = outerPoints[ i * 2];
      star5Points[ i * 4 + 1] = outerPoints[ i * 2 + 1];

      star5Points[ i * 4 + 2] = innerPoints[ i * 2];
      star5Points[ i * 4 + 3] = innerPoints[ i * 2 + 1];
    }
  }

  star5Points = math.fitPolygonToSquare( star5Points );

  this.generatePolygon( 'star', star5Points );

  this.generatePolygon( 'vee', [
    -1, -1,
    0, -0.333,
    1, -1,
    0, 1
  ] );

  this.generatePolygon( 'rhomboid', [
    -1, -1,
    0.333, -1,
    1, 1,
    -0.333, 1
  ] );

  this.generatePolygon( 'right-rhomboid', [
    -0.333, -1,
    1, -1,
    0.333, 1,
    -1, 1
  ] );

  this.nodeShapes['concavehexagon'] = this.generatePolygon( 'concave-hexagon', [
    -1, -0.95,
    -0.75, 0,
    -1, 0.95,
    1, 0.95,
    0.75, 0,
    1, -0.95
  ] );

  {
    const tagPoints = [
      -1, -1,
      0.25, -1,
      1, 0,
      0.25,1,
      -1, 1
    ];
    this.generatePolygon( 'tag', tagPoints );
    this.generateRoundPolygon( 'round-tag', tagPoints );
  }

  nodeShapes.makePolygon = function( points ){

    // use caching on user-specified polygons so they are as fast as native shapes

    var key = points.join( '$' );
    var name = 'polygon-' + key;
    var shape;

    if( (shape = this[ name ]) ){ // got cached shape
      return shape;
    }

    // create and cache new shape
    return renderer.generatePolygon( name, points );
  };

};

export default BRp;
