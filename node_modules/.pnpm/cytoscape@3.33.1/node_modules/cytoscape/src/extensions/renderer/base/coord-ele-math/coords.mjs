import * as math from '../../../../math.mjs';
import * as util from '../../../../util/index.mjs';

var BRp = {};

// Project mouse
BRp.projectIntoViewport = function( clientX, clientY ){
  var cy = this.cy;
  var offsets = this.findContainerClientCoords();
  var offsetLeft = offsets[0];
  var offsetTop = offsets[1];
  var scale = offsets[4];
  var pan = cy.pan();
  var zoom = cy.zoom();

  var x = ( (clientX - offsetLeft)/scale - pan.x ) / zoom;
  var y = ( (clientY - offsetTop)/scale - pan.y ) / zoom;

  return [ x, y ];
};

BRp.findContainerClientCoords = function(){
  if( this.containerBB ){
    return this.containerBB;
  }

  var container = this.container;
  var rect = container.getBoundingClientRect();
  var style = this.cy.window().getComputedStyle( container );
  var styleValue = function( name ){ return parseFloat( style.getPropertyValue( name ) ); };

  var padding = {
    left: styleValue('padding-left'),
    right: styleValue('padding-right'),
    top: styleValue('padding-top'),
    bottom: styleValue('padding-bottom')
  };

  var border = {
    left: styleValue('border-left-width'),
    right: styleValue('border-right-width'),
    top: styleValue('border-top-width'),
    bottom: styleValue('border-bottom-width')
  };

  var clientWidth = container.clientWidth;
  var clientHeight = container.clientHeight;

  var paddingHor =  padding.left + padding.right;
  var paddingVer = padding.top + padding.bottom;

  var borderHor = border.left + border.right;

  var scale = rect.width / ( clientWidth + borderHor );

  var unscaledW = clientWidth - paddingHor;
  var unscaledH = clientHeight - paddingVer;

  var left = rect.left + padding.left + border.left;
  var top = rect.top + padding.top + border.top;

  return ( this.containerBB = [
    left,
    top,
    unscaledW,
    unscaledH,
    scale
  ] );
};

BRp.invalidateContainerClientCoordsCache = function(){
  this.containerBB = null;
};

BRp.findNearestElement = function( x, y, interactiveElementsOnly, isTouch ){
  return this.findNearestElements( x, y, interactiveElementsOnly, isTouch )[0];
};

BRp.findNearestElements = function( x, y, interactiveElementsOnly, isTouch ){
  var self = this;
  var r = this;
  var eles = r.getCachedZSortedEles();
  var near = []; // 1 node max, 1 edge max
  var zoom = r.cy.zoom();
  var hasCompounds = r.cy.hasCompoundNodes();
  var edgeThreshold = (isTouch ? 24 : 8) / zoom;
  var nodeThreshold = (isTouch ? 8 : 2) / zoom;
  var labelThreshold = (isTouch ? 8 : 2) / zoom;
  var minSqDist = Infinity;
  var nearEdge;
  var nearNode;

  if( interactiveElementsOnly ){
    eles = eles.interactive;
  }

  function addEle( ele, sqDist ){
    if( ele.isNode() ){
      if( nearNode ){
        return; // can't replace node
      } else {
        nearNode = ele;
        near.push( ele );
      }
    }

    if( ele.isEdge() && ( sqDist == null || sqDist < minSqDist ) ){
      if( nearEdge ){ // then replace existing edge
        // can replace only if same z-index
        if(
          nearEdge.pstyle('z-compound-depth').value === ele.pstyle('z-compound-depth').value
          && nearEdge.pstyle('z-compound-depth').value === ele.pstyle('z-compound-depth').value
        ){
          for( var i = 0; i < near.length; i++ ){
            if( near[i].isEdge() ){
              near[i] = ele;
              nearEdge = ele;
              minSqDist = sqDist != null ? sqDist : minSqDist;
              break;
            }
          }
        }
      } else {
        near.push( ele );
        nearEdge = ele;
        minSqDist = sqDist != null ? sqDist : minSqDist;
      }
    }
  }

  function checkNode( node ){
    var width = node.outerWidth() + 2 * nodeThreshold;
    var height = node.outerHeight() + 2 * nodeThreshold;
    var hw = width / 2;
    var hh = height / 2;
    var pos = node.position();
    var cornerRadius = node.pstyle('corner-radius').value === 'auto' ? 'auto' : node.pstyle('corner-radius').pfValue;
    var rs = node._private.rscratch;

    if(
      pos.x - hw <= x && x <= pos.x + hw // bb check x
        &&
      pos.y - hh <= y && y <= pos.y + hh // bb check y
    ){
      var shape = r.nodeShapes[ self.getNodeShape( node ) ];

      if(
        shape.checkPoint( x, y, 0, width, height, pos.x, pos.y, cornerRadius, rs )
      ){
        addEle( node, 0 );
        return true;
      }

    }
  }

  function checkEdge( edge ){
    var _p = edge._private;

    var rs = _p.rscratch;
    var styleWidth = edge.pstyle( 'width' ).pfValue;
    var scale = edge.pstyle( 'arrow-scale' ).value;
    var width = styleWidth / 2 + edgeThreshold; // more like a distance radius from centre
    var widthSq = width * width;
    var width2 = width * 2;
    var src = _p.source;
    var tgt = _p.target;
    var sqDist;

    if( rs.edgeType === 'segments' || rs.edgeType === 'straight' || rs.edgeType === 'haystack' ){
      var pts = rs.allpts;

      for( var i = 0; i + 3 < pts.length; i += 2 ){
        if(
          (math.inLineVicinity( x, y, pts[ i ], pts[ i + 1], pts[ i + 2], pts[ i + 3], width2 ))
            &&
          widthSq > ( sqDist = math.sqdistToFiniteLine( x, y, pts[ i ], pts[ i + 1], pts[ i + 2], pts[ i + 3] ) )
        ){
          addEle( edge, sqDist );
          return true;
        }
      }

    } else if( rs.edgeType === 'bezier' || rs.edgeType === 'multibezier' || rs.edgeType === 'self' || rs.edgeType === 'compound' ){
      var pts = rs.allpts;
      for( var i = 0; i + 5 < rs.allpts.length; i += 4 ){
        if(
          (math.inBezierVicinity( x, y, pts[ i ], pts[ i + 1], pts[ i + 2], pts[ i + 3], pts[ i + 4], pts[ i + 5], width2 ))
            &&
          (widthSq > (sqDist = math.sqdistToQuadraticBezier( x, y, pts[ i ], pts[ i + 1], pts[ i + 2], pts[ i + 3], pts[ i + 4], pts[ i + 5] )) )
        ){
          addEle( edge, sqDist );
          return true;
        }
      }
    }

    // if we're close to the edge but didn't hit it, maybe we hit its arrows

    var src = src || _p.source;
    var tgt = tgt || _p.target;

    var arSize = self.getArrowWidth( styleWidth, scale );

    var arrows = [
      { name: 'source', x: rs.arrowStartX, y: rs.arrowStartY, angle: rs.srcArrowAngle },
      { name: 'target', x: rs.arrowEndX, y: rs.arrowEndY, angle: rs.tgtArrowAngle },
      { name: 'mid-source', x: rs.midX, y: rs.midY, angle: rs.midsrcArrowAngle },
      { name: 'mid-target', x: rs.midX, y: rs.midY, angle: rs.midtgtArrowAngle }
    ];

    for( var i = 0; i < arrows.length; i++ ){
      var ar = arrows[ i ];
      var shape = r.arrowShapes[ edge.pstyle( ar.name + '-arrow-shape' ).value ];
      var edgeWidth = edge.pstyle('width').pfValue;
      if(
        shape.roughCollide( x, y, arSize, ar.angle, { x: ar.x, y: ar.y }, edgeWidth, edgeThreshold )
         &&
        shape.collide( x, y, arSize, ar.angle, { x: ar.x, y: ar.y }, edgeWidth, edgeThreshold )
      ){
        addEle( edge );
        return true;
      }
    }

    // for compound graphs, hitting edge may actually want a connected node instead (b/c edge may have greater z-index precedence)
    if( hasCompounds && near.length > 0 ){
      checkNode( src );
      checkNode( tgt );
    }
  }

  function preprop( obj, name, pre ){
    return util.getPrefixedProperty( obj, name, pre );
  }

  function checkLabel( ele, prefix ){
    var _p = ele._private;
    var th = labelThreshold;

    var prefixDash;
    if( prefix ){
      prefixDash = prefix + '-';
    } else {
      prefixDash = '';
    }

    ele.boundingBox();
    var bb = _p.labelBounds[prefix || 'main'];

    var text = ele.pstyle( prefixDash + 'label' ).value;
    var eventsEnabled = ele.pstyle( 'text-events' ).strValue === 'yes';

    if( !eventsEnabled || !text ){ return; }

    var lx = preprop( _p.rscratch, 'labelX', prefix );
    var ly = preprop( _p.rscratch, 'labelY', prefix );

    var theta = preprop( _p.rscratch, 'labelAngle', prefix );

    var ox = ele.pstyle(prefixDash + 'text-margin-x').pfValue;
    let oy = ele.pstyle(prefixDash + 'text-margin-y').pfValue;

    var lx1 = bb.x1 - th - ox; // (-ox, -oy) as bb already includes margin
    var lx2 = bb.x2 + th - ox; // and rotation is about (lx, ly)
    var ly1 = bb.y1 - th - oy;
    var ly2 = bb.y2 + th - oy;

    if( theta ){
      var cos = Math.cos( theta );
      var sin = Math.sin( theta );

      var rotate = function( x, y ){
        x = x - lx;
        y = y - ly;

        return {
          x: x * cos - y * sin + lx,
          y: x * sin + y * cos + ly
        };
      };

      var px1y1 = rotate( lx1, ly1 );
      var px1y2 = rotate( lx1, ly2 );
      var px2y1 = rotate( lx2, ly1 );
      var px2y2 = rotate( lx2, ly2 );

      var points = [ // with the margin added after the rotation is applied
        px1y1.x + ox, px1y1.y + oy,
        px2y1.x + ox, px2y1.y + oy,
        px2y2.x + ox, px2y2.y + oy,
        px1y2.x + ox, px1y2.y + oy
      ];

      if( math.pointInsidePolygonPoints( x, y, points ) ){
        addEle( ele );
        return true;
      }
    } else { // do a cheaper bb check
      if( math.inBoundingBox( bb, x, y ) ){
        addEle( ele );
        return true;
      }
    }

  }

  for( var i = eles.length - 1; i >= 0; i-- ){ // reverse order for precedence
    var ele = eles[ i ];

    if( ele.isNode() ){
      checkNode( ele ) || checkLabel( ele );

    } else { // then edge
      checkEdge( ele ) || checkLabel( ele ) || checkLabel( ele, 'source' ) || checkLabel( ele, 'target' );
    }
  }

  return near;
};

// 'Give me everything from this box'
BRp.getAllInBox = function( x1, y1, x2, y2 ){
  var eles = this.getCachedZSortedEles().interactive;
  var zoom = this.cy.zoom();
  var labelThreshold = 2 / zoom;
  var box = [];

  var x1c = Math.min( x1, x2 );
  var x2c = Math.max( x1, x2 );
  var y1c = Math.min( y1, y2 );
  var y2c = Math.max( y1, y2 );

  x1 = x1c;
  x2 = x2c;
  y1 = y1c;
  y2 = y2c;

  var boxBb = math.makeBoundingBox( {
    x1: x1, y1: y1,
    x2: x2, y2: y2
  } );
  var selectionBox = [
    { x: boxBb.x1, y: boxBb.y1 },
    { x: boxBb.x2, y: boxBb.y1 },
    { x: boxBb.x2, y: boxBb.y2 },
    { x: boxBb.x1, y: boxBb.y2 },
  ];
  var boxEdges = [
    [selectionBox[0], selectionBox[1]],
    [selectionBox[1], selectionBox[2]],
    [selectionBox[2], selectionBox[3]],
    [selectionBox[3], selectionBox[0]]
  ];


  function preprop(obj, name, pre) {
    return util.getPrefixedProperty(obj, name, pre);
  }

  function getRotatedLabelBox(ele, prefix) {
    var _p = ele._private;
    var th = labelThreshold;

    var prefixDash = prefix ? prefix + '-' : '';
    ele.boundingBox();
    var bb = _p.labelBounds[prefix || 'main'];

    // If the bounding box is not available, return null.
    // This indicates that the label box cannot be calculated, which is consistent
    // with the expected behavior of this function. Returning null allows the caller
    // to handle the absence of a bounding box explicitly.
    if (!bb) {
      return null;
    }

    var lx = preprop(_p.rscratch, 'labelX', prefix);
    var ly = preprop(_p.rscratch, 'labelY', prefix);
    var theta = preprop(_p.rscratch, 'labelAngle', prefix);

    var ox = ele.pstyle(prefixDash + 'text-margin-x').pfValue;
    var oy = ele.pstyle(prefixDash + 'text-margin-y').pfValue;

    var lx1 = bb.x1 - th - ox;
    var lx2 = bb.x2 + th - ox;
    var ly1 = bb.y1 - th - oy;
    var ly2 = bb.y2 + th - oy;

    if (theta) {
      var cos = Math.cos(theta);
      var sin = Math.sin(theta);

      var rotate = function (x, y) {
        x = x - lx;
        y = y - ly;
        return {
          x: x * cos - y * sin + lx,
          y: x * sin + y * cos + ly,
        };
      };

      return [rotate(lx1, ly1), rotate(lx2, ly1), rotate(lx2, ly2), rotate(lx1, ly2)];
    } else {
      return [
        { x: lx1, y: ly1 },
        { x: lx2, y: ly1 },
        { x: lx2, y: ly2 },
        { x: lx1, y: ly2 },
      ];
    }
  }

  function doLinesIntersect(p1, p2, q1, q2) {
    function ccw(a, b, c) {
      return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    }
    return ccw(p1, q1, q2) !== ccw(p2, q1, q2) && ccw(p1, p2, q1) !== ccw(p1, p2, q2);
  }

  for( var e = 0; e < eles.length; e++ ){
    var ele = eles[e];

    if( ele.isNode() ){
      var node = ele;
      var textEvents = node.pstyle('text-events').strValue === 'yes';
      var nodeBoxSelectMode = node.pstyle('box-selection').strValue;
      var labelBoxSelectEnabled = node.pstyle('box-select-labels').strValue === 'yes';

      if ( nodeBoxSelectMode === 'none' ) {
        continue; 
      }
      var includeLabels = (nodeBoxSelectMode === 'overlap' || labelBoxSelectEnabled) && textEvents;
      var nodeBb = node.boundingBox({
        includeNodes: true,
        includeEdges: false,
        includeLabels,
      });
      
      if ( nodeBoxSelectMode === 'contain' ) {
        let selected = false;

        if (labelBoxSelectEnabled && textEvents) {
          const rotatedLabelBox = getRotatedLabelBox(node);
          if (rotatedLabelBox && math.satPolygonIntersection(rotatedLabelBox, selectionBox)) {
            box.push(node);
            selected = true;
          }
        }

        if (!selected && math.boundingBoxInBoundingBox(boxBb, nodeBb)) {
          box.push(node);
        }
      } else if ( nodeBoxSelectMode === 'overlap' ) {
        if (math.boundingBoxesIntersect(boxBb, nodeBb)) {
          const nodeBodyBb = node.boundingBox({ 
            includeNodes: true, 
            includeEdges: true, 
            includeLabels: false, 
            includeMainLabels: false, 
            includeSourceLabels: false, 
            includeTargetLabels: false 
          });

          const nodeBodyCorners = [
            { x: nodeBodyBb.x1, y: nodeBodyBb.y1 },
            { x: nodeBodyBb.x2, y: nodeBodyBb.y1 },
            { x: nodeBodyBb.x2, y: nodeBodyBb.y2 },
            { x: nodeBodyBb.x1, y: nodeBodyBb.y2 },
          ];

          // if node body intersects, no need to check label
          if (math.satPolygonIntersection(nodeBodyCorners, selectionBox)) {
            box.push(node);
          } else {
            // only check label if node body didn't intersect
            const rotatedLabelBox = getRotatedLabelBox(node);
            if (rotatedLabelBox && math.satPolygonIntersection(rotatedLabelBox, selectionBox)) {
              box.push(node);
            }
          }
        }
      }
    } else {
      var edge = ele;
      var _p = edge._private;
      var rs = _p.rscratch;
      var edgeBoxSelectMode = edge.pstyle('box-selection').strValue;

      if ( edgeBoxSelectMode === 'none' ) {
        continue; 
      }

      if ( edgeBoxSelectMode === 'contain' ) {
        if( rs.startX != null && rs.startY != null && !math.inBoundingBox( boxBb, rs.startX, rs.startY ) ){ continue; }
        if( rs.endX != null && rs.endY != null && !math.inBoundingBox( boxBb, rs.endX, rs.endY ) ){ continue; }
  
        if( rs.edgeType === 'bezier' || rs.edgeType === 'multibezier' || rs.edgeType === 'self' || rs.edgeType === 'compound' || rs.edgeType === 'segments' || rs.edgeType === 'haystack' ){
  
          let pts = _p.rstyle.bezierPts || _p.rstyle.linePts || _p.rstyle.haystackPts;
          let allInside = true;
  
          for( var i = 0; i < pts.length; i++ ){
            if( !math.pointInBoundingBox( boxBb, pts[ i ] ) ){
              allInside = false;
              break;
            }
          }
  
          if( allInside ){
            box.push( edge );
          }
  
        } else if( rs.edgeType === 'straight' ){
          box.push( edge );
        }
      } else if ( edgeBoxSelectMode === 'overlap' ) {
        let selected = false;

        // Check: either endpoint inside box
        if (
          rs.startX != null && rs.startY != null &&
          rs.endX != null && rs.endY != null &&
          (math.inBoundingBox(boxBb, rs.startX, rs.startY) || math.inBoundingBox(boxBb, rs.endX, rs.endY))
        ) {
          box.push(edge);
          selected = true;
        } 
        
        // Haystack fallback (only check if not already selected)
        else if (!selected && rs.edgeType === 'haystack') {
          const haystackPts = _p.rstyle.haystackPts;
          for (let i = 0; i < haystackPts.length; i++) {
            if (math.pointInBoundingBox(boxBb, haystackPts[i])) {
              box.push(edge);
              selected = true;
              break;
            }
          }
        }

        // Segment intersection check (only if not already selected)
        if (!selected) {
          let pts = _p.rstyle.bezierPts || _p.rstyle.linePts || _p.rstyle.haystackPts;

          // straight edges
          if ((!pts || pts.length < 2) && rs.edgeType === 'straight') {
            if (rs.startX != null && rs.startY != null && rs.endX != null && rs.endY != null) {
              pts = [
                { x: rs.startX, y: rs.startY },
                { x: rs.endX, y: rs.endY }
              ];
            }
          }
          if (!pts || pts.length < 2) continue;

          for (let i = 0; i < pts.length - 1; i++) {
            let segStart = pts[i];
            let segEnd = pts[i + 1];

            for (let b = 0; b < boxEdges.length; b++) {
              let [boxStart, boxEnd] = boxEdges[b];

              if (doLinesIntersect(segStart, segEnd, boxStart, boxEnd)) {
                box.push(edge);
                selected = true;
                break;
              }
            }

            if (selected) break;
          }
        }
      }
    }
  }

  return box;
};

export default BRp;
