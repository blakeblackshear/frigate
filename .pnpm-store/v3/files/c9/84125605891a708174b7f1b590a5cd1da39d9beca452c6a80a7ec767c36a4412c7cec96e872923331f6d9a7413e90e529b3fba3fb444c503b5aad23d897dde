import * as is from '../../is.mjs';
import { assignBoundingBox, expandBoundingBoxSides,  clearBoundingBox, expandBoundingBox, makeBoundingBox, copyBoundingBox, shiftBoundingBox, updateBoundingBox } from '../../math.mjs';
import {defaults, endsWith, getPrefixedProperty, hashIntsArray, memoize} from '../../util/index.mjs';

let fn, elesfn;

fn = elesfn = {};

elesfn.renderedBoundingBox = function( options ){
  let bb = this.boundingBox( options );
  let cy = this.cy();
  let zoom = cy.zoom();
  let pan = cy.pan();

  let x1 = bb.x1 * zoom + pan.x;
  let x2 = bb.x2 * zoom + pan.x;
  let y1 = bb.y1 * zoom + pan.y;
  let y2 = bb.y2 * zoom + pan.y;

  return {
    x1: x1,
    x2: x2,
    y1: y1,
    y2: y2,
    w: x2 - x1,
    h: y2 - y1
  };
};

elesfn.dirtyCompoundBoundsCache = function(silent = false){
  let cy = this.cy();

  if( !cy.styleEnabled() || !cy.hasCompoundNodes() ){ return this; }

  this.forEachUp( ele => {
    if( ele.isParent() ){
      let _p = ele._private;

      _p.compoundBoundsClean = false;
      _p.bbCache = null;

      if(!silent){
        ele.emitAndNotify('bounds');
      }
    }
  } );

  return this;
};

elesfn.updateCompoundBounds = function(force = false){
  let cy = this.cy();

  // not possible to do on non-compound graphs or with the style disabled
  if( !cy.styleEnabled() || !cy.hasCompoundNodes() ){ return this; }

  // save cycles when batching -- but bounds will be stale (or not exist yet)
  if( !force && cy.batching() ){ return this; }

  function update( parent ){
    if( !parent.isParent() ){ return; }

    let _p = parent._private;
    let children = parent.children();
    let includeLabels = parent.pstyle( 'compound-sizing-wrt-labels' ).value === 'include';

    let min = {
      width: {
        val: parent.pstyle( 'min-width' ).pfValue,
        left: parent.pstyle( 'min-width-bias-left' ),
        right: parent.pstyle( 'min-width-bias-right' )
      },
      height: {
        val: parent.pstyle( 'min-height' ).pfValue,
        top: parent.pstyle( 'min-height-bias-top' ),
        bottom: parent.pstyle( 'min-height-bias-bottom' )
      }
    };

    let bb = children.boundingBox( {
      includeLabels: includeLabels,
      includeOverlays: false,

      // updating the compound bounds happens outside of the regular
      // cache cycle (i.e. before fired events)
      useCache: false
    } );
    let pos = _p.position;

    // if children take up zero area then keep position and fall back on stylesheet w/h
    if( bb.w === 0 || bb.h === 0 ){
      bb = {
        w: parent.pstyle('width').pfValue,
        h: parent.pstyle('height').pfValue
      };

      bb.x1 = pos.x - bb.w/2;
      bb.x2 = pos.x + bb.w/2;
      bb.y1 = pos.y - bb.h/2;
      bb.y2 = pos.y + bb.h/2;
    }

    function computeBiasValues( propDiff, propBias, propBiasComplement ){
      let biasDiff = 0;
      let biasComplementDiff = 0;
      let biasTotal = propBias + propBiasComplement;

      if( propDiff > 0 && biasTotal > 0 ){
        biasDiff = ( propBias / biasTotal ) * propDiff;
        biasComplementDiff = ( propBiasComplement / biasTotal ) * propDiff;
      }
      return {
        biasDiff: biasDiff,
        biasComplementDiff: biasComplementDiff
      };
    }

    function computePaddingValues( width, height, paddingObject, relativeTo ) {
      // Assuming percentage is number from 0 to 1
      if(paddingObject.units === '%') {
        switch(relativeTo) {
          case 'width':
            return width > 0 ? paddingObject.pfValue * width : 0;
          case 'height':
            return height > 0 ? paddingObject.pfValue * height : 0;
          case 'average':
            return ( width > 0 ) && ( height > 0 ) ? paddingObject.pfValue * ( width + height ) / 2 : 0;
          case 'min':
            return ( width > 0 ) && ( height > 0 ) ? ( ( width > height ) ? paddingObject.pfValue * height : paddingObject.pfValue * width ) : 0;
          case 'max':
            return ( width > 0 ) && ( height > 0 ) ? ( ( width > height ) ? paddingObject.pfValue * width : paddingObject.pfValue * height ) : 0;
          default:
            return 0;
        }
      } else if(paddingObject.units === 'px') {
        return paddingObject.pfValue;
      } else {
        return 0;
      }
    }

    let leftVal = min.width.left.value;
    if( min.width.left.units === 'px' && min.width.val > 0 ){
      leftVal = ( leftVal * 100 ) / min.width.val;
    }
    let rightVal = min.width.right.value;
    if( min.width.right.units === 'px' && min.width.val > 0 ){
      rightVal = ( rightVal * 100 ) / min.width.val;
    }

    let topVal = min.height.top.value;
    if( min.height.top.units === 'px' && min.height.val > 0 ){
      topVal = ( topVal * 100 ) / min.height.val;
    }

    let bottomVal = min.height.bottom.value;
    if( min.height.bottom.units === 'px' && min.height.val > 0 ){
      bottomVal = ( bottomVal * 100 ) / min.height.val;
    }

    let widthBiasDiffs = computeBiasValues( min.width.val - bb.w, leftVal, rightVal );
    let diffLeft = widthBiasDiffs.biasDiff;
    let diffRight = widthBiasDiffs.biasComplementDiff;

    let heightBiasDiffs = computeBiasValues( min.height.val - bb.h, topVal, bottomVal );
    let diffTop = heightBiasDiffs.biasDiff;
    let diffBottom = heightBiasDiffs.biasComplementDiff;

    _p.autoPadding = computePaddingValues( bb.w, bb.h, parent.pstyle( 'padding' ), parent.pstyle( 'padding-relative-to' ).value );

    _p.autoWidth = Math.max(bb.w, min.width.val);
    pos.x = (- diffLeft + bb.x1 + bb.x2 + diffRight) / 2;

    _p.autoHeight = Math.max(bb.h, min.height.val);
    pos.y = (- diffTop + bb.y1 + bb.y2 + diffBottom) / 2;
  }

  for( let i = 0; i < this.length; i++ ){
    let ele = this[i];
    let _p = ele._private;

    if( !_p.compoundBoundsClean || force ){
      update( ele );

      if( !cy.batching() ){
        _p.compoundBoundsClean = true;
      }
    }
  }

  return this;
};

let noninf = function( x ){
  if( x === Infinity || x === -Infinity ){
    return 0;
  }

  return x;
};

let updateBounds = function( b, x1, y1, x2, y2 ){
  // don't update with zero area boxes
  if( x2 - x1 === 0 || y2 - y1 === 0 ){ return; }

  // don't update with null dim
  if( x1 == null || y1 == null || x2 == null || y2 == null ){ return; }

  b.x1 = x1 < b.x1 ? x1 : b.x1;
  b.x2 = x2 > b.x2 ? x2 : b.x2;
  b.y1 = y1 < b.y1 ? y1 : b.y1;
  b.y2 = y2 > b.y2 ? y2 : b.y2;
  b.w = b.x2 - b.x1;
  b.h = b.y2 - b.y1;
};

let updateBoundsFromBox = function( b, b2 ){
  if( b2 == null ){ return b; }

  return updateBounds( b, b2.x1, b2.y1, b2.x2, b2.y2 );
};

let prefixedProperty = function( obj, field, prefix ){
  return getPrefixedProperty( obj, field, prefix );
};

let updateBoundsFromArrow = function( bounds, ele, prefix ){
  if( ele.cy().headless() ){ return; }

  let _p = ele._private;
  let rstyle = _p.rstyle;
  let halfArW = rstyle.arrowWidth / 2;
  let arrowType = ele.pstyle( prefix + '-arrow-shape' ).value;
  let x;
  let y;

  if( arrowType !== 'none' ){
    if( prefix === 'source' ){
      x = rstyle.srcX;
      y = rstyle.srcY;
    } else if( prefix === 'target' ){
      x = rstyle.tgtX;
      y = rstyle.tgtY;
    } else {
      x = rstyle.midX;
      y = rstyle.midY;
    }

    // always store the individual arrow bounds
    let bbs = _p.arrowBounds = _p.arrowBounds || {};
    let bb = bbs[prefix] = bbs[prefix] || {};
    bb.x1 = x - halfArW;
    bb.y1 = y - halfArW;
    bb.x2 = x + halfArW;
    bb.y2 = y + halfArW;
    bb.w = bb.x2 - bb.x1;
    bb.h = bb.y2 - bb.y1;
    expandBoundingBox(bb, 1);

    updateBounds( bounds, bb.x1, bb.y1, bb.x2, bb.y2 );
  }
};

let updateBoundsFromLabel = function( bounds, ele, prefix ){
  if( ele.cy().headless() ){ return; }

  let prefixDash;

  if( prefix ){
    prefixDash = prefix + '-';
  } else {
    prefixDash = '';
  }

  let _p = ele._private;
  let rstyle = _p.rstyle;
  let label = ele.pstyle( prefixDash + 'label' ).strValue;

  if( label ){
    let halign = ele.pstyle( 'text-halign' );
    let valign = ele.pstyle( 'text-valign' );
    let labelWidth = prefixedProperty( rstyle, 'labelWidth', prefix );
    let labelHeight = prefixedProperty( rstyle, 'labelHeight', prefix );
    let labelX = prefixedProperty( rstyle, 'labelX', prefix );
    let labelY = prefixedProperty( rstyle, 'labelY', prefix );
    let marginX = ele.pstyle( prefixDash + 'text-margin-x' ).pfValue;
    let marginY = ele.pstyle( prefixDash + 'text-margin-y' ).pfValue;
    let isEdge = ele.isEdge();
    let rotation = ele.pstyle( prefixDash + 'text-rotation' );
    let outlineWidth = ele.pstyle( 'text-outline-width' ).pfValue;
    let borderWidth = ele.pstyle( 'text-border-width' ).pfValue;
    let halfBorderWidth = borderWidth / 2;
    let padding = ele.pstyle( 'text-background-padding' ).pfValue;
    let marginOfError = 2; // expand to work around browser dimension inaccuracies

    let lh = labelHeight;
    let lw = labelWidth;
    let lw_2 = lw / 2;
    let lh_2 = lh / 2;
    let lx1, lx2, ly1, ly2;

    if( isEdge ){
      lx1 = labelX - lw_2;
      lx2 = labelX + lw_2;
      ly1 = labelY - lh_2;
      ly2 = labelY + lh_2;
    } else {
      switch( halign.value ){
        case 'left':
          lx1 = labelX - lw;
          lx2 = labelX;
          break;

        case 'center':
          lx1 = labelX - lw_2;
          lx2 = labelX + lw_2;
          break;

        case 'right':
          lx1 = labelX;
          lx2 = labelX + lw;
          break;
      }

      switch( valign.value ){
        case 'top':
          ly1 = labelY - lh;
          ly2 = labelY;
          break;

        case 'center':
          ly1 = labelY - lh_2;
          ly2 = labelY + lh_2;
          break;

        case 'bottom':
          ly1 = labelY;
          ly2 = labelY + lh;
          break;
      }
    }

    // shift by margin and expand by outline and border
    let leftPad  = marginX - Math.max( outlineWidth, halfBorderWidth ) - padding - marginOfError;
    let rightPad = marginX + Math.max( outlineWidth, halfBorderWidth ) + padding + marginOfError;
    let topPad   = marginY - Math.max( outlineWidth, halfBorderWidth ) - padding - marginOfError;
    let botPad   = marginY + Math.max( outlineWidth, halfBorderWidth ) + padding + marginOfError;

    lx1 += leftPad;
    lx2 += rightPad;
    ly1 += topPad;
    ly2 += botPad;

    // always store the unrotated label bounds separately
    let bbPrefix = prefix || 'main';
    let bbs = _p.labelBounds;
    let bb = bbs[bbPrefix] = bbs[bbPrefix] || {};
    bb.x1 = lx1;
    bb.y1 = ly1;
    bb.x2 = lx2;
    bb.y2 = ly2;
    bb.w = lx2 - lx1;
    bb.h = ly2 - ly1;
    bb.leftPad = leftPad;
    bb.rightPad = rightPad;
    bb.topPad = topPad;
    bb.botPad = botPad;

    let isAutorotate = ( isEdge && rotation.strValue === 'autorotate' );
    let isPfValue = ( rotation.pfValue != null && rotation.pfValue !== 0 );

    if( isAutorotate || isPfValue ){
      let theta = isAutorotate ? prefixedProperty( _p.rstyle, 'labelAngle', prefix ) : rotation.pfValue;
      let cos = Math.cos( theta );
      let sin = Math.sin( theta );

      // rotation point (default value for center-center)
      let xo = (lx1 + lx2)/2;
      let yo = (ly1 + ly2)/2;

      if( !isEdge ){
        switch( halign.value ){
          case 'left':
            xo = lx2;
            break;

          case 'right':
            xo = lx1;
            break;
        }

        switch( valign.value ){
          case 'top':
            yo = ly2;
            break;

          case 'bottom':
            yo = ly1;
            break;
        }
      }

      let rotate = function( x, y ){
        x = x - xo;
        y = y - yo;

        return {
          x: x * cos - y * sin + xo,
          y: x * sin + y * cos + yo
        };
      };

      let px1y1 = rotate( lx1, ly1 );
      let px1y2 = rotate( lx1, ly2 );
      let px2y1 = rotate( lx2, ly1 );
      let px2y2 = rotate( lx2, ly2 );

      lx1 = Math.min( px1y1.x, px1y2.x, px2y1.x, px2y2.x );
      lx2 = Math.max( px1y1.x, px1y2.x, px2y1.x, px2y2.x );
      ly1 = Math.min( px1y1.y, px1y2.y, px2y1.y, px2y2.y );
      ly2 = Math.max( px1y1.y, px1y2.y, px2y1.y, px2y2.y );
    }

    let bbPrefixRot = bbPrefix + 'Rot';
    let bbRot = bbs[bbPrefixRot] = bbs[bbPrefixRot] || {};
    bbRot.x1 = lx1;
    bbRot.y1 = ly1;
    bbRot.x2 = lx2;
    bbRot.y2 = ly2;
    bbRot.w = lx2 - lx1;
    bbRot.h = ly2 - ly1;

    updateBounds( bounds, lx1, ly1, lx2, ly2 );
    updateBounds( _p.labelBounds.all, lx1, ly1, lx2, ly2 );
  }

  return bounds;
};

let updateBoundsFromOutline = function (bounds, ele) {
  if (ele.cy().headless()) { return; }
  
  let outlineOpacity = ele.pstyle('outline-opacity').value;
  let outlineWidth = ele.pstyle('outline-width').value;
  let outlineOffset = ele.pstyle('outline-offset').value;
  let expansion = outlineWidth + outlineOffset;

  updateBoundsFromMiter( bounds, ele, outlineOpacity, expansion, 'outside', expansion/2 );
};

let updateBoundsFromMiter = function( bounds, ele, opacity, expansionSize, expansionPosition, useFallbackValue){
  if (opacity === 0 || expansionSize <= 0 || expansionPosition === 'inside') {
    return;
  }
  
  let cy = ele.cy();
  let shape = ele.pstyle('shape').value
  let rshape = cy.renderer().nodeShapes[shape];
  let { x, y } = ele.position();
  let w = ele.width();
  let h = ele.height();

  if (rshape.hasMiterBounds) {
    if (expansionPosition === 'center') {
      expansionSize /= 2;
    }

    let mbb = rshape.miterBounds(x, y, w, h, expansionSize);

    updateBoundsFromBox(bounds, mbb);
  } else if (useFallbackValue != null && useFallbackValue > 0) {
    expandBoundingBoxSides(bounds, [useFallbackValue, useFallbackValue, useFallbackValue, useFallbackValue]);
  }
};

let updateBoundsFromMiterBorder = function( bounds, ele ){
  if (ele.cy().headless()) { return; }

  let borderOpacity = ele.pstyle('border-opacity').value;
  let borderWidth = ele.pstyle('border-width').pfValue;
  let borderPosition = ele.pstyle('border-position').value;

  updateBoundsFromMiter(bounds, ele, borderOpacity, borderWidth, borderPosition);
};

// get the bounding box of the elements (in raw model position)
let boundingBoxImpl = function( ele, options ){
  let cy = ele._private.cy;
  let styleEnabled = cy.styleEnabled();
  let headless = cy.headless();

  let bounds = makeBoundingBox();

  let _p = ele._private;
  let isNode = ele.isNode();
  let isEdge = ele.isEdge();
  let ex1, ex2, ey1, ey2; // extrema of body / lines
  let x, y; // node pos
  let rstyle = _p.rstyle;
  let manualExpansion = isNode && styleEnabled ? ele.pstyle('bounds-expansion').pfValue : [0];

  // must use `display` prop only, as reading `compound.width()` causes recursion
  // (other factors like width values will be considered later in this function anyway)
  let isDisplayed = ele => ele.pstyle('display').value !== 'none';

  let displayed = (
    !styleEnabled
    || (
      isDisplayed(ele)

      // must take into account connected nodes b/c of implicit edge hiding on display:none node
      && ( !isEdge || ( isDisplayed(ele.source()) && isDisplayed(ele.target()) ) )
    )
  );

  if( displayed ){ // displayed suffices, since we will find zero area eles anyway
    let overlayOpacity = 0;
    let overlayPadding = 0;

    if( styleEnabled && options.includeOverlays ){
      overlayOpacity = ele.pstyle( 'overlay-opacity' ).value;

      if( overlayOpacity !== 0 ){
        overlayPadding = ele.pstyle( 'overlay-padding' ).value;
      }
    }

    let underlayOpacity = 0;
    let underlayPadding = 0;

    if( styleEnabled && options.includeUnderlays ){
      underlayOpacity = ele.pstyle( 'underlay-opacity' ).value;

      if( underlayOpacity !== 0 ){
        underlayPadding = ele.pstyle( 'underlay-padding' ).value;
      }
    }

    let padding = Math.max(overlayPadding, underlayPadding);

    let w = 0;
    let wHalf = 0;

    if( styleEnabled ){
      w = ele.pstyle( 'width' ).pfValue;
      wHalf = w / 2;
    }

    if( isNode && options.includeNodes ){
      let pos = ele.position();
      x = pos.x;
      y = pos.y;
      let w = ele.outerWidth();
      let halfW = w / 2;
      let h = ele.outerHeight();
      let halfH = h / 2;

      // handle node dimensions
      /////////////////////////

      ex1 = x - halfW;
      ex2 = x + halfW;
      ey1 = y - halfH;
      ey2 = y + halfH;

      updateBounds( bounds, ex1, ey1, ex2, ey2 );

      if( styleEnabled ){
        updateBoundsFromOutline(bounds, ele)
      }

      if( styleEnabled && options.includeOutlines && !headless ){
        updateBoundsFromOutline( bounds, ele );
      }

      if (styleEnabled) {
        updateBoundsFromMiterBorder(bounds, ele);
      }
    } else if( isEdge && options.includeEdges ){

      if( styleEnabled && !headless ){
        let curveStyle = ele.pstyle( 'curve-style').strValue;


        // handle edge dimensions (rough box estimate)
        //////////////////////////////////////////////

        ex1 = Math.min( rstyle.srcX, rstyle.midX, rstyle.tgtX );
        ex2 = Math.max( rstyle.srcX, rstyle.midX, rstyle.tgtX );
        ey1 = Math.min( rstyle.srcY, rstyle.midY, rstyle.tgtY );
        ey2 = Math.max( rstyle.srcY, rstyle.midY, rstyle.tgtY );

        // take into account edge width
        ex1 -= wHalf;
        ex2 += wHalf;
        ey1 -= wHalf;
        ey2 += wHalf;

        updateBounds( bounds, ex1, ey1, ex2, ey2 );


        // precise edges
        ////////////////

        if( curveStyle === 'haystack' ){
          let hpts = rstyle.haystackPts;

          if( hpts && hpts.length === 2 ){
            ex1 = hpts[0].x;
            ey1 = hpts[0].y;
            ex2 = hpts[1].x;
            ey2 = hpts[1].y;

            if( ex1 > ex2 ){
              let temp = ex1;
              ex1 = ex2;
              ex2 = temp;
            }

            if( ey1 > ey2 ){
              let temp = ey1;
              ey1 = ey2;
              ey2 = temp;
            }

            updateBounds( bounds, ex1 - wHalf, ey1 - wHalf, ex2 + wHalf, ey2 + wHalf );
          }

        } else if(
          curveStyle === 'bezier' || curveStyle === 'unbundled-bezier'
          || endsWith(curveStyle, 'segments') || endsWith(curveStyle, 'taxi')
        ){
          let pts;

          switch( curveStyle ){
            case 'bezier':
            case 'unbundled-bezier':
              pts = rstyle.bezierPts;
              break;
            case 'segments':
            case 'taxi':
            case 'round-segments':
            case 'round-taxi':
              pts = rstyle.linePts;
              break;
          }

          if( pts != null ){
            for( let j = 0; j < pts.length; j++ ){
              let pt = pts[ j ];

              ex1 = pt.x - wHalf;
              ex2 = pt.x + wHalf;
              ey1 = pt.y - wHalf;
              ey2 = pt.y + wHalf;

              updateBounds( bounds, ex1, ey1, ex2, ey2 );
            }
          }
        } // bezier-like or segment-like edge
      } else { // headless or style disabled

        // fallback on source and target positions
        //////////////////////////////////////////

        let n1 = ele.source();
        let n1pos = n1.position();

        let n2 = ele.target();
        let n2pos = n2.position();

        ex1 = n1pos.x;
        ex2 = n2pos.x;
        ey1 = n1pos.y;
        ey2 = n2pos.y;

        if( ex1 > ex2 ){
          let temp = ex1;
          ex1 = ex2;
          ex2 = temp;
        }

        if( ey1 > ey2 ){
          let temp = ey1;
          ey1 = ey2;
          ey2 = temp;
        }

        // take into account edge width
        ex1 -= wHalf;
        ex2 += wHalf;
        ey1 -= wHalf;
        ey2 += wHalf;

        updateBounds( bounds, ex1, ey1, ex2, ey2 );
      } // headless or style disabled

    } // edges

    // handle edge arrow size
    /////////////////////////

    if( styleEnabled && options.includeEdges && isEdge ){
      updateBoundsFromArrow( bounds, ele, 'mid-source', options );
      updateBoundsFromArrow( bounds, ele, 'mid-target', options );
      updateBoundsFromArrow( bounds, ele, 'source', options );
      updateBoundsFromArrow( bounds, ele, 'target', options );
    }

    // ghost
    ////////

    if( styleEnabled ){
      let ghost = ele.pstyle('ghost').value === 'yes';

      if( ghost ){
        let gx = ele.pstyle('ghost-offset-x').pfValue;
        let gy = ele.pstyle('ghost-offset-y').pfValue;

        updateBounds( bounds, bounds.x1 + gx, bounds.y1 + gy, bounds.x2 + gx, bounds.y2 + gy );
      }
    }

    // always store the body bounds separately from the labels
    let bbBody = _p.bodyBounds = _p.bodyBounds || {};
    assignBoundingBox(bbBody, bounds);
    expandBoundingBoxSides(bbBody, manualExpansion);
    expandBoundingBox(bbBody, 1); // expand to work around browser dimension inaccuracies

    // overlay
    //////////

    if( styleEnabled ){
      ex1 = bounds.x1;
      ex2 = bounds.x2;
      ey1 = bounds.y1;
      ey2 = bounds.y2;

      updateBounds( bounds, ex1 - padding, ey1 - padding, ex2 + padding, ey2 + padding );
    }

    // always store the body bounds separately from the labels
    let bbOverlay = _p.overlayBounds = _p.overlayBounds || {};
    assignBoundingBox(bbOverlay, bounds);
    expandBoundingBoxSides(bbOverlay, manualExpansion);
    expandBoundingBox(bbOverlay, 1); // expand to work around browser dimension inaccuracies

    // handle label dimensions
    //////////////////////////

    let bbLabels = _p.labelBounds = _p.labelBounds || {};

    if( bbLabels.all != null ){
      clearBoundingBox(bbLabels.all);
    } else {
      bbLabels.all = makeBoundingBox();
    }

    if( styleEnabled && options.includeLabels ){
      if( options.includeMainLabels ){
        updateBoundsFromLabel( bounds, ele, null, options );
      }

      if( isEdge ){
        if( options.includeSourceLabels ){
          updateBoundsFromLabel( bounds, ele, 'source', options );
        }

        if( options.includeTargetLabels ){
          updateBoundsFromLabel( bounds, ele, 'target', options );
        }
      }
    } // style enabled for labels
  } // if displayed


  bounds.x1 = noninf( bounds.x1 );
  bounds.y1 = noninf( bounds.y1 );
  bounds.x2 = noninf( bounds.x2 );
  bounds.y2 = noninf( bounds.y2 );
  bounds.w = noninf( bounds.x2 - bounds.x1 );
  bounds.h = noninf( bounds.y2 - bounds.y1 );

  if( bounds.w > 0 && bounds.h > 0 && displayed ){
    expandBoundingBoxSides( bounds, manualExpansion );

    // expand bounds by 1 because antialiasing can increase the visual/effective size by 1 on all sides
    expandBoundingBox( bounds, 1 );
  }

  return bounds;
};

let getKey = function( opts ){
  let i = 0;
  let tf = val => (val ? 1 : 0) << i++;
  let key = 0;

  key += tf( opts.incudeNodes );
  key += tf( opts.includeEdges );
  key += tf( opts.includeLabels );
  key += tf( opts.includeMainLabels );
  key += tf( opts.includeSourceLabels );
  key += tf( opts.includeTargetLabels );
  key += tf( opts.includeOverlays );
  key += tf( opts.includeOutlines );

  return key;
};

let getBoundingBoxPosKey = ele => {
  let r = x => Math.round(x);

  if( ele.isEdge() ){
    let p1 = ele.source().position();
    let p2 = ele.target().position();

    return hashIntsArray([ r(p1.x), r(p1.y), r(p2.x), r(p2.y) ]);
  } else {
    let p = ele.position();

    return hashIntsArray([ r(p.x), r(p.y) ]);
  }
};

let cachedBoundingBoxImpl = function( ele, opts ){
  let _p = ele._private;
  let bb;
  let isEdge = ele.isEdge();
  let key = opts == null ? defBbOptsKey : getKey( opts );
  let usingDefOpts = key === defBbOptsKey;

  if( _p.bbCache == null ){
    bb = boundingBoxImpl( ele, defBbOpts );

    _p.bbCache = bb;
    _p.bbCachePosKey = getBoundingBoxPosKey( ele );
  } else {
    bb = _p.bbCache;
  }

  // not using def opts => need to build up bb from combination of sub bbs
  if( !usingDefOpts ){
    let isNode = ele.isNode();

    bb = makeBoundingBox();

    if( (opts.includeNodes && isNode) || (opts.includeEdges && !isNode) ){
      if( opts.includeOverlays ){
        updateBoundsFromBox(bb, _p.overlayBounds);
      } else {
        updateBoundsFromBox(bb, _p.bodyBounds);
      }
    }

    if( opts.includeLabels ){
      if( opts.includeMainLabels && (!isEdge || (opts.includeSourceLabels && opts.includeTargetLabels)) ){
        updateBoundsFromBox(bb, _p.labelBounds.all);
      } else {
        if( opts.includeMainLabels ){
          updateBoundsFromBox(bb, _p.labelBounds.mainRot);
        }

        if( opts.includeSourceLabels ){
          updateBoundsFromBox(bb, _p.labelBounds.sourceRot);
        }

        if( opts.includeTargetLabels ){
          updateBoundsFromBox(bb, _p.labelBounds.targetRot);
        }
      }
    }

    bb.w = bb.x2 - bb.x1;
    bb.h = bb.y2 - bb.y1;
  }

  return bb;
};

let defBbOpts = {
  includeNodes: true,
  includeEdges: true,
  includeLabels: true,
  includeMainLabels: true,
  includeSourceLabels: true,
  includeTargetLabels: true,
  includeOverlays: true,
  includeUnderlays: true,
  includeOutlines: true,
  useCache: true
};

const defBbOptsKey = getKey( defBbOpts );

const filledBbOpts = defaults( defBbOpts );

elesfn.boundingBox = function( options ){
  let bounds;

  let useCache = (options === undefined || options.useCache === undefined || options.useCache === true);

  let isDirty = memoize(ele => {
    let _p = ele._private;

    return _p.bbCache == null || _p.styleDirty || _p.bbCachePosKey !== getBoundingBoxPosKey(ele);
  }, ele => ele.id());

  // the main usecase is ele.boundingBox() for a single element with no/def options
  // specified s.t. the cache is used, so check for this case to make it faster by
  // avoiding the overhead of the rest of the function
  if (useCache && this.length === 1 && !isDirty(this[0])) {
    if (options === undefined) {
      options = defBbOpts;
    } else {
      options = filledBbOpts( options );
    }

    bounds = cachedBoundingBoxImpl(this[0], options);
  } else {
    bounds = makeBoundingBox();

    options = options || defBbOpts;

    let opts = filledBbOpts(options);

    let eles = this;
    let cy = eles.cy();
    let styleEnabled = cy.styleEnabled();

    // cache the isDirty state for all eles, edges first since they depend on node state
    this.edges().forEach(isDirty);
    this.nodes().forEach(isDirty);

    if(styleEnabled) {
      this.recalculateRenderedStyle(useCache);
    }

    this.updateCompoundBounds(!useCache);

    for (let i = 0; i < eles.length; i++) {
      let ele = eles[i];

      if (isDirty(ele)) {
        ele.dirtyBoundingBoxCache();
      }

      updateBoundsFromBox(bounds, cachedBoundingBoxImpl(ele, opts));
    }
  }

  bounds.x1 = noninf( bounds.x1 );
  bounds.y1 = noninf( bounds.y1 );
  bounds.x2 = noninf( bounds.x2 );
  bounds.y2 = noninf( bounds.y2 );
  bounds.w = noninf( bounds.x2 - bounds.x1 );
  bounds.h = noninf( bounds.y2 - bounds.y1 );

  return bounds;
};

elesfn.dirtyBoundingBoxCache = function(){
  for( let i = 0; i < this.length; i++ ){
    let _p = this[i]._private;

    _p.bbCache = null;
    _p.bbCachePosKey = null;
    _p.bodyBounds = null;
    _p.overlayBounds = null;
    _p.labelBounds.all = null;
    _p.labelBounds.source = null;
    _p.labelBounds.target = null;
    _p.labelBounds.main = null;
    _p.labelBounds.sourceRot = null;
    _p.labelBounds.targetRot = null;
    _p.labelBounds.mainRot = null;
    _p.arrowBounds.source = null;
    _p.arrowBounds.target = null;
    _p.arrowBounds['mid-source'] = null;
    _p.arrowBounds['mid-target'] = null;
  }

  this.emitAndNotify('bounds');

  return this;
};

// private helper to get bounding box for custom node positions
// - good for perf in certain cases but currently requires dirtying the rendered style
// - would be better to not modify the nodes but the nodes are read directly everywhere in the renderer...
// - try to use for only things like discrete layouts where the node position would change anyway
elesfn.boundingBoxAt = function( fn ){
  let nodes = this.nodes();
  let cy = this.cy();
  let hasCompoundNodes = cy.hasCompoundNodes();
  let parents = cy.collection();

  if( hasCompoundNodes ){
    parents = nodes.filter(node => node.isParent());
    nodes = nodes.not(parents);
  }

  if( is.plainObject( fn ) ){
    let obj = fn;

    fn = function(){ return obj; };
  }

  let storeOldPos = (node, i) => node._private.bbAtOldPos = fn(node, i);
  let getOldPos = (node) => node._private.bbAtOldPos;

  cy.startBatch();

  (
    nodes
    .forEach(storeOldPos)
    .silentPositions(fn)
  );

  if( hasCompoundNodes ){
    parents.dirtyCompoundBoundsCache();
    parents.dirtyBoundingBoxCache();
    parents.updateCompoundBounds(true); // force update b/c we're inside a batch cycle
  }

  let bb = copyBoundingBox( this.boundingBox({ useCache: false }) );

  nodes.silentPositions(getOldPos);

  if( hasCompoundNodes ){
    parents.dirtyCompoundBoundsCache();
    parents.dirtyBoundingBoxCache();
    parents.updateCompoundBounds(true); // force update b/c we're inside a batch cycle
  }

  cy.endBatch();

  return bb;
};

fn.boundingbox = fn.bb = fn.boundingBox;
fn.renderedBoundingbox = fn.renderedBoundingBox;

export default elesfn;
