/* global Path2D */

import * as is from '../../../is.mjs';
import {expandPolygon, joinLines} from '../../../math.mjs';
import * as util from '../../../util/index.mjs';
import * as round from "../../../round.mjs";
import * as math from "../../../math.mjs";

let CRp = {};

CRp.drawNode = function( context, node, shiftToOriginWithBb, drawLabel = true, shouldDrawOverlay = true, shouldDrawOpacity = true ){
  let r = this;
  let nodeWidth, nodeHeight;
  let _p = node._private;
  let rs = _p.rscratch;
  let pos = node.position();

  if( !is.number( pos.x ) || !is.number( pos.y ) ){
    return; // can't draw node with undefined position
  }

  if( shouldDrawOpacity && !node.visible() ){ return; }

  let eleOpacity = shouldDrawOpacity ? node.effectiveOpacity() : 1;

  let usePaths = r.usePaths();
  let path;
  let pathCacheHit = false;

  let padding = node.padding();

  nodeWidth = node.width() + 2 * padding;
  nodeHeight = node.height() + 2 * padding;

  //
  // setup shift

  let bb;
  if( shiftToOriginWithBb ){
    bb = shiftToOriginWithBb;

    context.translate( -bb.x1, -bb.y1 );
  }

  //
  // load bg image

  let bgImgProp = node.pstyle( 'background-image' );
  let urls = bgImgProp.value;
  let urlDefined = new Array( urls.length );
  let image = new Array( urls.length );
  let numImages = 0;
  for( let i = 0; i < urls.length; i++ ){
    let url = urls[i];
    let defd = urlDefined[i] = url != null && url !== 'none';

    if( defd ){
      let bgImgCrossOrigin = node.cy().style().getIndexedStyle(node, 'background-image-crossorigin', 'value', i);

      numImages++;

      // get image, and if not loaded then ask to redraw when later loaded
      image[i] = r.getCachedImage( url, bgImgCrossOrigin, function(){
        _p.backgroundTimestamp = Date.now();

        node.emitAndNotify('background');
      } );
    }
  }

  //
  // setup styles

  let darkness = node.pstyle('background-blacken').value;
  let borderWidth = node.pstyle('border-width').pfValue;
  let bgOpacity = node.pstyle('background-opacity').value * eleOpacity;
  let borderColor = node.pstyle('border-color').value;
  let borderStyle = node.pstyle('border-style').value;
  let borderJoin = node.pstyle('border-join').value;
  let borderCap = node.pstyle('border-cap').value;
  let borderPosition = node.pstyle('border-position').value;
  let borderPattern = node.pstyle('border-dash-pattern').pfValue;
  let borderOffset = node.pstyle('border-dash-offset').pfValue;
  let borderOpacity = node.pstyle('border-opacity').value * eleOpacity;
  let outlineWidth = node.pstyle('outline-width').pfValue;
  let outlineColor = node.pstyle('outline-color').value;
  let outlineStyle = node.pstyle('outline-style').value;
  let outlineOpacity = node.pstyle('outline-opacity').value * eleOpacity;
  let outlineOffset = node.pstyle('outline-offset').value;
  let cornerRadius = node.pstyle('corner-radius').value;
  if (cornerRadius !== 'auto') cornerRadius = node.pstyle('corner-radius').pfValue;

  let setupShapeColor = ( bgOpy = bgOpacity ) => {
    r.eleFillStyle( context, node, bgOpy );
  };

  let setupBorderColor = ( bdrOpy = borderOpacity ) => {
    r.colorStrokeStyle( context, borderColor[0], borderColor[1], borderColor[2], bdrOpy );
  };

  let setupOutlineColor = ( otlnOpy = outlineOpacity ) => {
    r.colorStrokeStyle( context, outlineColor[0], outlineColor[1], outlineColor[2], otlnOpy );
  };

  //
  // setup shape

  let getPath = (width, height, shape, points) => {
    let pathCache = r.nodePathCache = r.nodePathCache || [];

    let key = util.hashStrings(
      shape === 'polygon' ? shape + ',' + points.join(',') : shape,
      '' + height,
      '' + width,
      '' + cornerRadius
    );

    let cachedPath = pathCache[ key ];
    let path;
    let cacheHit = false;

    if( cachedPath != null ){
      path = cachedPath;
      cacheHit = true;
      rs.pathCache = path;
    } else {
      path = new Path2D();
      pathCache[ key ] = rs.pathCache = path;
    }

    return {
      path,
      cacheHit
    };
  };

  let styleShape = node.pstyle('shape').strValue;
  let shapePts = node.pstyle('shape-polygon-points').pfValue;

  if( usePaths ){
    context.translate( pos.x, pos.y );

    const shapePath = getPath(nodeWidth, nodeHeight, styleShape, shapePts);
    path = shapePath.path;
    pathCacheHit = shapePath.cacheHit;
  }

  let drawShape = () => {
    if( !pathCacheHit ){

      let npos = pos;

      if( usePaths ){
        npos = {
          x: 0,
          y: 0
        };
      }

      r.nodeShapes[ r.getNodeShape( node ) ].draw(
        ( path || context ),
        npos.x,
        npos.y,
        nodeWidth,
        nodeHeight, cornerRadius, rs );
    }

    if( usePaths ){
      context.fill( path );
    } else {
      context.fill();
    }
  };

  let drawImages = ( nodeOpacity = eleOpacity, inside = true ) => {
    let prevBging = _p.backgrounding;
    let totalCompleted = 0;

    for( let i = 0; i < image.length; i++ ){
      const bgContainment = node.cy().style().getIndexedStyle(node, 'background-image-containment', 'value', i);
      if( inside && bgContainment === 'over' || !inside && bgContainment === 'inside' ){
        totalCompleted++;
        continue;
      }

      if( urlDefined[i] && image[i].complete && !image[i].error ){
        totalCompleted++;
        r.drawInscribedImage( context, image[i], node, i, nodeOpacity );
      }
    }

    _p.backgrounding = !(totalCompleted === numImages);
    if( prevBging !== _p.backgrounding ){ // update style b/c :backgrounding state changed
      node.updateStyle( false );
    }
  };

  let drawPie = ( redrawShape = false, pieOpacity = eleOpacity ) => {
    if( r.hasPie( node ) ){
      r.drawPie( context, node, pieOpacity );

      // redraw/restore path if steps after pie need it
      if( redrawShape ){

        if( !usePaths ){
          r.nodeShapes[ r.getNodeShape( node ) ].draw(
              context,
              pos.x,
              pos.y,
              nodeWidth,
              nodeHeight, cornerRadius, rs );
        }
      }
    }
  };

  let drawStripe = (redrawShape = false, stripeOpacity = eleOpacity) => {
    if( r.hasStripe( node ) ){
      context.save();

      if (usePaths) {
        context.clip( rs.pathCache );
      } else {
        r.nodeShapes[ r.getNodeShape( node ) ].draw(
          context,
          pos.x,
          pos.y,
          nodeWidth,
          nodeHeight, cornerRadius, rs );
          context.clip();
      }

      r.drawStripe( context, node, stripeOpacity );

      context.restore();

      // redraw/restore path if steps after stripes need it
      if( redrawShape ){

        if( !usePaths ){
          r.nodeShapes[ r.getNodeShape( node ) ].draw(
              context,
              pos.x,
              pos.y,
              nodeWidth,
              nodeHeight, cornerRadius, rs );
        }
      }
    }
  };

  let darken = ( darkenOpacity = eleOpacity ) => {
    let opacity = ( darkness > 0 ? darkness : -darkness ) * darkenOpacity;
    let c = darkness > 0 ? 0 : 255;

    if( darkness !== 0 ){
      r.colorFillStyle( context, c, c, c, opacity );

      if( usePaths ){
        context.fill( path );
      } else {
        context.fill();
      }
    }
  };

  let drawBorder = () => {
    if( borderWidth > 0 ){

      context.lineWidth = borderWidth;
      context.lineCap = borderCap;
      context.lineJoin = borderJoin;

      if( context.setLineDash ){ // for very outofdate browsers
        switch( borderStyle ){
          case 'dotted':
            context.setLineDash( [ 1, 1 ] );
            break;

          case 'dashed':
            context.setLineDash( borderPattern );
            context.lineDashOffset = borderOffset;
            break;

          case 'solid':
          case 'double':
            context.setLineDash( [ ] );
            break;
        }
      }

      if ( borderPosition !== 'center') {
        context.save();
        context.lineWidth *= 2;
        if (borderPosition === 'inside') {
          usePaths ? context.clip(path) : context.clip();
        } else {
          const region = new Path2D();
          region.rect(
          -nodeWidth / 2 - borderWidth,
          -nodeHeight / 2 - borderWidth,
          nodeWidth + 2 * borderWidth,
          nodeHeight + 2 * borderWidth
          );
          region.addPath(path);
          context.clip(region, 'evenodd');
        }
        usePaths ? context.stroke(path) : context.stroke();
        context.restore();
      } else {
        usePaths ? context.stroke(path) : context.stroke();
      }

      if( borderStyle === 'double' ){
        context.lineWidth = borderWidth / 3;

        let gco = context.globalCompositeOperation;
        context.globalCompositeOperation = 'destination-out';

        if( usePaths ){
          context.stroke( path );
        } else {
          context.stroke();
        }

        context.globalCompositeOperation = gco;
      }

      // reset in case we changed the border style
      if( context.setLineDash ){ // for very outofdate browsers
        context.setLineDash( [ ] );
      }
    }
  };

  let drawOutline = () => {
    if( outlineWidth > 0 ){
      context.lineWidth = outlineWidth;
      context.lineCap = 'butt';

      if( context.setLineDash ){ // for very outofdate browsers
        switch( outlineStyle ){
          case 'dotted':
            context.setLineDash( [ 1, 1 ] );
            break;

          case 'dashed':
            context.setLineDash( [ 4, 2 ] );
            break;

          case 'solid':
          case 'double':
            context.setLineDash( [ ] );
            break;
        }
      }

      let npos = pos;

      if( usePaths ){
        npos = {
          x: 0,
          y: 0
        };
      }

      let shape = r.getNodeShape( node );

      let bWidth = borderWidth;
      if( borderPosition === 'inside' ) bWidth = 0;
      if( borderPosition === 'outside' ) bWidth *= 2;

      let scaleX = (nodeWidth + bWidth + (outlineWidth + outlineOffset)) / nodeWidth;
      let scaleY = (nodeHeight + bWidth + (outlineWidth + outlineOffset)) / nodeHeight;
      let sWidth = nodeWidth * scaleX;
      let sHeight = nodeHeight * scaleY;

      let points = r.nodeShapes[ shape ].points;
      let path;

      if (usePaths) {
        let outlinePath = getPath(sWidth, sHeight, shape, points);
        path = outlinePath.path;
      }

      // draw the outline path, either by using expanded points or by scaling 
      // the dimensions, depending on shape
      if (shape === "ellipse") {
        r.drawEllipsePath(path || context, npos.x, npos.y, sWidth, sHeight);
      } else if ([
        'round-diamond', 'round-heptagon', 'round-hexagon', 'round-octagon',
        'round-pentagon', 'round-polygon', 'round-triangle', 'round-tag'
      ].includes(shape)) {
        let sMult = 0;
        let offsetX = 0;
        let offsetY = 0;

        if (shape === 'round-diamond') {
          sMult = (bWidth + outlineOffset + outlineWidth) * 1.4;
        } else if (shape === 'round-heptagon') {
          sMult = (bWidth + outlineOffset + outlineWidth) * 1.075;
          offsetY = -(bWidth/2 + outlineOffset + outlineWidth) / 35;
        } else if (shape === 'round-hexagon') {
          sMult = (bWidth + outlineOffset + outlineWidth) * 1.12;
        } else if (shape === 'round-pentagon') {
          sMult = (bWidth + outlineOffset + outlineWidth) * 1.13;
          offsetY = -(bWidth/2 + outlineOffset + outlineWidth) / 15;
        } else if (shape === 'round-tag') {
          sMult = (bWidth + outlineOffset + outlineWidth) * 1.12;
          offsetX = (bWidth/2 + outlineWidth + outlineOffset) * .07;
        } else if (shape === 'round-triangle') {
          sMult = (bWidth + outlineOffset + outlineWidth) * (Math.PI/2);
          offsetY = -(bWidth + outlineOffset/2 + outlineWidth) / Math.PI;
        }

        if (sMult !== 0) {
          scaleX = (nodeWidth + sMult)/nodeWidth;
          sWidth = nodeWidth * scaleX;
          if ( ! ['round-hexagon', 'round-tag'].includes(shape) ) {
            scaleY = (nodeHeight + sMult)/nodeHeight;
            sHeight = nodeHeight * scaleY;
          }
        }

        cornerRadius = cornerRadius === 'auto' ? math.getRoundPolygonRadius( sWidth, sHeight ) : cornerRadius;

        const halfW = sWidth / 2;
        const halfH = sHeight / 2;
        const radius = cornerRadius + ( bWidth +  outlineWidth + outlineOffset ) / 2;
        const p = new Array( points.length / 2 );
        const corners = new Array( points.length / 2 );

        for ( let i = 0; i < points.length / 2; i++ ){
          p[i] = {
            x: npos.x + offsetX + halfW * points[ i * 2 ],
            y: npos.y + offsetY + halfH * points[ i * 2 + 1 ]
          };
        }

        let i, p1, p2, p3, len = p.length;

        p1 = p[ len - 1 ];
        // for each point
        for( i = 0; i < len; i++ ){
          p2 = p[ (i) % len ];
          p3 = p[ (i + 1) % len ];
          corners[ i ] = round.getRoundCorner( p1, p2, p3, radius );
          p1 = p2;
          p2 = p3;
        }

        r.drawRoundPolygonPath(path || context, npos.x + offsetX, npos.y + offsetY, nodeWidth * scaleX, nodeHeight * scaleY, points, corners );
      } else if (['roundrectangle', 'round-rectangle'].includes(shape)) {
        cornerRadius = cornerRadius === 'auto' ? math.getRoundRectangleRadius( sWidth, sHeight ) : cornerRadius;
        r.drawRoundRectanglePath(path || context, npos.x, npos.y, sWidth, sHeight, cornerRadius + ( bWidth +  outlineWidth + outlineOffset ) / 2 );
      } else if (['cutrectangle', 'cut-rectangle'].includes(shape)) {
        cornerRadius = cornerRadius === 'auto' ? math.getCutRectangleCornerLength( sWidth, sHeight ) : cornerRadius;
        r.drawCutRectanglePath(path || context, npos.x, npos.y, sWidth, sHeight, null ,cornerRadius + ( bWidth +  outlineWidth  + outlineOffset ) / 4   );
      } else if (['bottomroundrectangle', 'bottom-round-rectangle'].includes(shape)) {
        cornerRadius = cornerRadius === 'auto' ? math.getRoundRectangleRadius( sWidth, sHeight ) : cornerRadius;
        r.drawBottomRoundRectanglePath(path || context, npos.x, npos.y, sWidth, sHeight, cornerRadius + ( bWidth +  outlineWidth + outlineOffset ) / 2 );
      } else if (shape === "barrel") {
        r.drawBarrelPath(path || context, npos.x, npos.y, sWidth, sHeight);
      } else if (shape.startsWith("polygon") || ['rhomboid', 'right-rhomboid', 'round-tag', 'tag', 'vee'].includes(shape)) {
        let pad = (bWidth + outlineWidth + outlineOffset) / nodeWidth;
        points = joinLines(expandPolygon(points, pad));
        r.drawPolygonPath(path || context, npos.x, npos.y, nodeWidth, nodeHeight, points);
      } else {
        let pad = (bWidth + outlineWidth + outlineOffset) / nodeWidth;
        points = joinLines(expandPolygon(points, -pad));
        r.drawPolygonPath(path || context, npos.x, npos.y, nodeWidth, nodeHeight, points);
      }

      if( usePaths ){
        context.stroke( path );
      } else {
        context.stroke();
      }

      if( outlineStyle === 'double' ){
        context.lineWidth = bWidth / 3;

        let gco = context.globalCompositeOperation;
        context.globalCompositeOperation = 'destination-out';

        if( usePaths ){
          context.stroke( path );
        } else {
          context.stroke();
        }

        context.globalCompositeOperation = gco;
      }

      // reset in case we changed the border style
      if( context.setLineDash ){ // for very outofdate browsers
        context.setLineDash( [ ] );
      }
    }
  };

  let drawOverlay = () => {
    if( shouldDrawOverlay ){
      r.drawNodeOverlay( context, node, pos, nodeWidth, nodeHeight );
    }
  };

  let drawUnderlay = () => {
    if( shouldDrawOverlay ){
      r.drawNodeUnderlay( context, node, pos, nodeWidth, nodeHeight );
    }
  };

  let drawText = () => {
    r.drawElementText( context, node, null, drawLabel );
  };

  let ghost = node.pstyle('ghost').value === 'yes';

  if( ghost ){
    let gx = node.pstyle('ghost-offset-x').pfValue;
    let gy = node.pstyle('ghost-offset-y').pfValue;
    let ghostOpacity = node.pstyle('ghost-opacity').value;
    let effGhostOpacity = ghostOpacity * eleOpacity;

    context.translate( gx, gy );

    setupOutlineColor();
    drawOutline();
    setupShapeColor( ghostOpacity * bgOpacity );
    drawShape();
    drawImages( effGhostOpacity, true );
    setupBorderColor( ghostOpacity * borderOpacity );
    drawBorder();
    drawPie( darkness !== 0 || borderWidth !== 0 );
    drawStripe( darkness !== 0 || borderWidth !== 0 );
    drawImages( effGhostOpacity, false );
    darken( effGhostOpacity );

    context.translate( -gx, -gy );
  }

  if( usePaths ){
    context.translate( -pos.x, -pos.y );
  }
  drawUnderlay();
  if( usePaths ){
    context.translate( pos.x, pos.y );
  }

  setupOutlineColor();
  drawOutline();
  setupShapeColor();
  drawShape();
  drawImages(eleOpacity, true);
  setupBorderColor();
  drawBorder();
  drawPie( darkness !== 0 || borderWidth !== 0 );
  drawStripe( darkness !== 0 || borderWidth !== 0 );
  drawImages(eleOpacity, false);

  darken();

  if( usePaths ){
    context.translate( -pos.x, -pos.y );
  }

  drawText();

  drawOverlay();

  //
  // clean up shift

  if( shiftToOriginWithBb ){
    context.translate( bb.x1, bb.y1 );
  }

};

const drawNodeOverlayUnderlay = function( overlayOrUnderlay ) {
  if (!['overlay', 'underlay'].includes(overlayOrUnderlay)) {
    throw new Error('Invalid state');
  }

  return function( context, node, pos, nodeWidth, nodeHeight ){
    let r = this;

    if( !node.visible() ){ return; }

    let padding = node.pstyle( `${overlayOrUnderlay}-padding` ).pfValue;
    let opacity = node.pstyle( `${overlayOrUnderlay}-opacity` ).value;
    let color = node.pstyle( `${overlayOrUnderlay}-color` ).value;
    let shape = node.pstyle( `${overlayOrUnderlay}-shape` ).value;
    let radius = node.pstyle( `${overlayOrUnderlay}-corner-radius` ).value;

    if( opacity > 0 ){
      pos = pos || node.position();

      if( nodeWidth == null || nodeHeight == null ){
        let padding = node.padding();

        nodeWidth = node.width() + 2 * padding;
        nodeHeight = node.height() + 2 * padding;
      }

      r.colorFillStyle( context, color[0], color[1], color[2], opacity );

      r.nodeShapes[shape].draw(
        context,
        pos.x,
        pos.y,
        nodeWidth + padding * 2,
        nodeHeight + padding * 2,
        radius
      );

      context.fill();
    }
  };
};

CRp.drawNodeOverlay = drawNodeOverlayUnderlay('overlay');

CRp.drawNodeUnderlay = drawNodeOverlayUnderlay('underlay');

// does the node have at least one pie piece?
CRp.hasPie = function( node ){
  node = node[0]; // ensure ele ref

  return node._private.hasPie;
};

CRp.hasStripe = function( node ){
  node = node[0]; // ensure ele ref

  return node._private.hasStripe;
};

CRp.drawPie = function( context, node, nodeOpacity, pos ){
  node = node[0]; // ensure ele ref
  pos = pos || node.position();

  let cyStyle = node.cy().style();
  let pieSize = node.pstyle( 'pie-size' );
  let hole = node.pstyle('pie-hole');
  let overallStartAngle = node.pstyle('pie-start-angle').pfValue;
  let x = pos.x;
  let y = pos.y;
  let nodeW = node.width();
  let nodeH = node.height();
  let radius = Math.min( nodeW, nodeH ) / 2; // must fit in node
  let holeRadius;
  let lastPercent = 0; // what % to continue drawing pie slices from on [0, 1]
  let usePaths = this.usePaths();

  if( usePaths ){
    x = 0;
    y = 0;
  }

  if( pieSize.units === '%' ){
    radius = radius * pieSize.pfValue;
  } else if( pieSize.pfValue !== undefined ){
    radius = pieSize.pfValue / 2; // diameter in pixels => radius
  }

  if (hole.units === '%') {
    holeRadius = radius * hole.pfValue;
  } else if (hole.pfValue !== undefined) {
    holeRadius = hole.pfValue / 2; // diameter in pixels => radius
  }

  if (holeRadius >= radius) {
    return; // the pie would be invisible anyway
  }

  for( let i = 1; i <= cyStyle.pieBackgroundN; i++ ){ // 1..N
    let size = node.pstyle( 'pie-' + i + '-background-size' ).value;
    let color = node.pstyle( 'pie-' + i + '-background-color' ).value;
    let opacity = node.pstyle( 'pie-' + i + '-background-opacity' ).value * nodeOpacity;
    let percent = size / 100; // map integer range [0, 100] to [0, 1]

    // percent can't push beyond 1
    if( percent + lastPercent > 1 ){
      percent = 1 - lastPercent;
    }

    let angleStart = (1.5 * Math.PI) + (2 * Math.PI * lastPercent); // start at 12 o'clock and go clockwise
    angleStart += overallStartAngle; // shift by the overall pie start angle
    let angleDelta = 2 * Math.PI * percent;
    let angleEnd = angleStart + angleDelta;

    // ignore if
    // - zero size
    // - we're already beyond the full circle
    // - adding the current slice would go beyond the full circle
    if( size === 0 || lastPercent >= 1 || lastPercent + percent > 1 ){
      continue;
    }

    if (holeRadius === 0) { // make a pie slice
      context.beginPath();
      context.moveTo( x, y );
      context.arc( x, y, radius, angleStart, angleEnd );
      context.closePath();
    } else { // make a pie slice that's like the above but with a hole in the middle
      context.beginPath();
      context.arc(x, y, radius, angleStart, angleEnd);
      context.arc(x, y, holeRadius, angleEnd, angleStart, true); // true for anticlockwise
      context.closePath();
    }

    this.colorFillStyle( context, color[0], color[1], color[2], opacity );

    context.fill();

    lastPercent += percent;
  }

};

CRp.drawStripe = function( context, node, nodeOpacity, pos ){
  node = node[0]; // ensure ele ref
  pos = pos || node.position();

  let cyStyle = node.cy().style();
  let x = pos.x;
  let y = pos.y;
  let nodeW = node.width();
  let nodeH = node.height();
  let lastPercent = 0; // what % to continue drawing pie slices from on [0, 1]
  let usePaths = this.usePaths();

  context.save();

  let direction = node.pstyle('stripe-direction').value;
  let stripeSize = node.pstyle('stripe-size');

  switch (direction) {
    case 'vertical':
      break; // default
    case 'righward':
      context.rotate(-Math.PI / 2);
      break;
  }

  let stripeW = nodeW;
  let stripeH = nodeH;

  if( stripeSize.units === '%' ){
    stripeW = stripeW * stripeSize.pfValue;
    stripeH = stripeH * stripeSize.pfValue;
  } else if( stripeSize.pfValue !== undefined ){
    stripeW = stripeSize.pfValue;
    stripeH = stripeSize.pfValue;
  }

  if( usePaths ){
    x = 0;
    y = 0;
  }

  // shift up from the centre of the node to the top-left corner
  y -= stripeW / 2;
  x -= stripeH / 2;

  for( let i = 1; i <= cyStyle.stripeBackgroundN; i++ ){ // 1..N
    let size = node.pstyle( 'stripe-' + i + '-background-size' ).value;
    let color = node.pstyle( 'stripe-' + i + '-background-color' ).value;
    let opacity = node.pstyle( 'stripe-' + i + '-background-opacity' ).value * nodeOpacity;
    let percent = size / 100; // map integer range [0, 100] to [0, 1]

    // percent can't push beyond 1
    if( percent + lastPercent > 1 ){
      percent = 1 - lastPercent;
    }

    // ignore if
    // - zero size
    // - we're already beyond the full chart
    // - adding the current slice would go beyond the full chart
    if( size === 0 || lastPercent >= 1 || lastPercent + percent > 1 ){
      continue;
    }

    // draw rect for the current stripe
    context.beginPath();
    context.rect( x, y + stripeH * lastPercent, stripeW, stripeH * percent );
    context.closePath();

    this.colorFillStyle( context, color[0], color[1], color[2], opacity );

    context.fill();

    lastPercent += percent;
  }

  context.restore();

};


export default CRp;
