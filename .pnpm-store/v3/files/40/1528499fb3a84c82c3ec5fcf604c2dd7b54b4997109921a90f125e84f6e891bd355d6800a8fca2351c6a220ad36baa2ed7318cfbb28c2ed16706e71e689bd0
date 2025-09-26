import * as math from '../../../../math.mjs';
import * as is from '../../../../is.mjs';
import * as util from '../../../../util/index.mjs';

let BRp = {};

BRp.recalculateNodeLabelProjection = function( node ){
  let content = node.pstyle( 'label' ).strValue;

  if( is.emptyString(content) ){ return; }

  let textX, textY;
  let _p = node._private;
  let nodeWidth = node.width();
  let nodeHeight = node.height();
  let padding = node.padding();
  let nodePos = node.position();
  let textHalign = node.pstyle( 'text-halign' ).strValue;
  let textValign = node.pstyle( 'text-valign' ).strValue;
  let rs = _p.rscratch;
  let rstyle = _p.rstyle;

  switch( textHalign ){
    case 'left':
      textX = nodePos.x - nodeWidth / 2 - padding;
      break;

    case 'right':
      textX = nodePos.x + nodeWidth / 2 + padding;
      break;

    default: // e.g. center
      textX = nodePos.x;
  }

  switch( textValign ){
    case 'top':
      textY = nodePos.y - nodeHeight / 2 - padding;
      break;

    case 'bottom':
      textY = nodePos.y + nodeHeight / 2 + padding;
      break;

    default: // e.g. middle
      textY = nodePos.y;
  }

  rs.labelX = textX;
  rs.labelY = textY;
  rstyle.labelX = textX;
  rstyle.labelY = textY;

  this.calculateLabelAngles( node );
  this.applyLabelDimensions( node );
};

let lineAngleFromDelta = function( dx, dy ){
  let angle = Math.atan( dy / dx );

  if( dx === 0 && angle < 0 ){
    angle = angle * -1;
  }

  return angle;
};

let lineAngle = function( p0, p1 ){
  let dx = p1.x - p0.x;
  let dy = p1.y - p0.y;

  return lineAngleFromDelta( dx, dy );
};

let bezierAngle = function( p0, p1, p2, t ){
  let t0 = math.bound( 0, t - 0.001, 1 );
  let t1 = math.bound( 0, t + 0.001, 1 );

  let lp0 = math.qbezierPtAt( p0, p1, p2, t0 );
  let lp1 = math.qbezierPtAt( p0, p1, p2, t1 );

  return lineAngle( lp0, lp1 );
};

BRp.recalculateEdgeLabelProjections = function( edge ){
  let p;
  let _p = edge._private;
  let rs = _p.rscratch;
  let r = this;
  let content = {
    mid: edge.pstyle('label').strValue,
    source: edge.pstyle('source-label').strValue,
    target: edge.pstyle('target-label').strValue
  };

  if( content.mid || content.source || content.target ){
    // then we have to calculate...
  } else {
    return; // no labels => no calcs
  }

  // add center point to style so bounding box calculations can use it
  //
  p = {
    x: rs.midX,
    y: rs.midY
  };

  let setRs = function( propName, prefix, value ){
    util.setPrefixedProperty( _p.rscratch, propName, prefix, value );
    util.setPrefixedProperty( _p.rstyle, propName, prefix, value );
  };

  setRs( 'labelX', null, p.x );
  setRs( 'labelY', null, p.y );

  let midAngle = lineAngleFromDelta(rs.midDispX, rs.midDispY);
  setRs( 'labelAutoAngle', null, midAngle );

  let createControlPointInfo = function(){
    if( createControlPointInfo.cache ){ return createControlPointInfo.cache; } // use cache so only 1x per edge

    let ctrlpts = [];

    // store each ctrlpt info init
    for( let i = 0; i + 5 < rs.allpts.length; i += 4 ){
      let p0 = { x: rs.allpts[i], y: rs.allpts[i+1] };
      let p1 = { x: rs.allpts[i+2], y: rs.allpts[i+3] }; // ctrlpt
      let p2 = { x: rs.allpts[i+4], y: rs.allpts[i+5] };

      ctrlpts.push({
        p0: p0,
        p1: p1,
        p2: p2,
        startDist: 0,
        length: 0,
        segments: []
      });
    }

    let bpts = _p.rstyle.bezierPts;
    let nProjs = r.bezierProjPcts.length;

    function addSegment( cp, p0, p1, t0, t1 ){
      let length = math.dist( p0, p1 );
      let prevSegment = cp.segments[ cp.segments.length - 1 ];
      let segment = {
        p0: p0,
        p1: p1,
        t0: t0,
        t1: t1,
        startDist: prevSegment ? prevSegment.startDist + prevSegment.length : 0,
        length: length
      };

      cp.segments.push( segment );

      cp.length += length;
    }

    // update each ctrlpt with segment info
    for( let i = 0; i < ctrlpts.length; i++ ){
      let cp = ctrlpts[i];
      let prevCp = ctrlpts[i - 1];

      if( prevCp ){
        cp.startDist = prevCp.startDist + prevCp.length;
      }

      addSegment(
        cp,
        cp.p0,   bpts[ i * nProjs ],
        0,       r.bezierProjPcts[ 0 ]
      ); // first

      for( let j = 0; j < nProjs - 1; j++ ){
        addSegment(
          cp,
          bpts[ i * nProjs + j ],   bpts[ i * nProjs + j + 1 ],
          r.bezierProjPcts[ j ],    r.bezierProjPcts[ j + 1 ]
        );
      }

      addSegment(
        cp,
        bpts[ i * nProjs + nProjs - 1 ],   cp.p2,
        r.bezierProjPcts[ nProjs - 1 ],    1
      ); // last
    }

    return ( createControlPointInfo.cache = ctrlpts );
  };

  let calculateEndProjection = function( prefix ){
    let angle;
    let isSrc = prefix === 'source';

    if( !content[ prefix ] ){ return; }

    let offset = edge.pstyle(prefix+'-text-offset').pfValue;

    switch( rs.edgeType ){
      case 'self':
      case 'compound':
      case 'bezier':
      case 'multibezier': {
        let cps = createControlPointInfo();
        let selected;
        let startDist = 0;
        let totalDist = 0;

        // find the segment we're on
        for( let i = 0; i < cps.length; i++ ){
          let cp = cps[ isSrc ? i : cps.length - 1 - i ];

          for( let j = 0; j < cp.segments.length; j++ ){
            let seg = cp.segments[ isSrc ? j : cp.segments.length - 1 - j ];
            let lastSeg = i === cps.length - 1 && j === cp.segments.length - 1;

            startDist = totalDist;
            totalDist += seg.length;

            if( totalDist >= offset || lastSeg ){
              selected = { cp: cp, segment: seg };
              break;
            }
          }

          if( selected ){ break; }
        }

        let cp = selected.cp;
        let seg = selected.segment;
        let tSegment = ( offset - startDist ) / ( seg.length );
        let segDt = seg.t1 - seg.t0;
        let t = isSrc ? seg.t0 + segDt * tSegment : seg.t1 - segDt * tSegment;

        t = math.bound( 0, t, 1 );
        p = math.qbezierPtAt( cp.p0, cp.p1, cp.p2, t );
        angle = bezierAngle( cp.p0, cp.p1, cp.p2, t, p );

        break;
      }
      case 'straight':
      case 'segments':
      case 'haystack': {
        let d = 0, di, d0;
        let p0, p1;
        let l = rs.allpts.length;

        for( let i = 0; i + 3 < l; i += 2 ){
          if( isSrc ){
            p0 = { x: rs.allpts[i],     y: rs.allpts[i+1] };
            p1 = { x: rs.allpts[i+2],   y: rs.allpts[i+3] };
          } else {
            p0 = { x: rs.allpts[l-2-i], y: rs.allpts[l-1-i] };
            p1 = { x: rs.allpts[l-4-i], y: rs.allpts[l-3-i] };
          }

          di = math.dist( p0, p1 );
          d0 = d;
          d += di;

          if( d >= offset ){ break; }
        }

        let pD = offset - d0;
        let t = pD / di;

        t  = math.bound( 0, t, 1 );
        p = math.lineAt( p0, p1, t );
        angle = lineAngle( p0, p1 );

        break;
      }
    }

    setRs( 'labelX', prefix, p.x );
    setRs( 'labelY', prefix, p.y );
    setRs( 'labelAutoAngle', prefix, angle );
  };

  calculateEndProjection( 'source' );
  calculateEndProjection( 'target' );

  this.applyLabelDimensions( edge );
};

BRp.applyLabelDimensions = function( ele ){
  this.applyPrefixedLabelDimensions( ele );

  if( ele.isEdge() ){
    this.applyPrefixedLabelDimensions( ele, 'source' );
    this.applyPrefixedLabelDimensions( ele, 'target' );
  }
};

BRp.applyPrefixedLabelDimensions = function( ele, prefix ){
  let _p = ele._private;

  let text = this.getLabelText( ele, prefix );

  let cacheKey = util.hashString( text, ele._private.labelDimsKey );

  // save recalc if the label is the same as before
  if( util.getPrefixedProperty( _p.rscratch, 'prefixedLabelDimsKey', prefix ) === cacheKey ){
    return; // then the label dimensions + text are the same
  }

  // save the key
  util.setPrefixedProperty( _p.rscratch, 'prefixedLabelDimsKey', prefix, cacheKey );

  let labelDims = this.calculateLabelDimensions( ele, text );
  let lineHeight = ele.pstyle('line-height').pfValue;
  let textWrap = ele.pstyle('text-wrap').strValue;
  let lines = util.getPrefixedProperty( _p.rscratch, 'labelWrapCachedLines', prefix ) || [];
  let numLines = textWrap !== 'wrap' ? 1 : Math.max(lines.length, 1);
  let normPerLineHeight = labelDims.height / numLines;
  let labelLineHeight = normPerLineHeight * lineHeight;

  let width = labelDims.width;
  let height = labelDims.height + (numLines - 1) * (lineHeight - 1) * normPerLineHeight;

  util.setPrefixedProperty( _p.rstyle,   'labelWidth', prefix, width );
  util.setPrefixedProperty( _p.rscratch, 'labelWidth', prefix, width );

  util.setPrefixedProperty( _p.rstyle,   'labelHeight', prefix, height );
  util.setPrefixedProperty( _p.rscratch, 'labelHeight', prefix, height );

  util.setPrefixedProperty( _p.rscratch, 'labelLineHeight', prefix, labelLineHeight );
};

BRp.getLabelText = function( ele, prefix ){
  let _p = ele._private;
  let pfd = prefix ? prefix + '-' : '';
  let text = ele.pstyle( pfd + 'label' ).strValue;
  let textTransform = ele.pstyle( 'text-transform' ).value;
  let rscratch = function( propName, value ){
    if( value ){
      util.setPrefixedProperty( _p.rscratch, propName, prefix, value );
      return value;
    } else {
      return util.getPrefixedProperty( _p.rscratch, propName, prefix );
    }
  };

  // for empty text, skip all processing
  if( !text ){ return ''; }

  if( textTransform == 'none' ){
    // passthrough
  } else if( textTransform == 'uppercase' ){
    text = text.toUpperCase();
  } else if( textTransform == 'lowercase' ){
    text = text.toLowerCase();
  }

  let wrapStyle = ele.pstyle( 'text-wrap' ).value;

  if( wrapStyle === 'wrap' ){
    let labelKey = rscratch( 'labelKey' );

    // save recalc if the label is the same as before
    if( labelKey != null && rscratch( 'labelWrapKey' ) === labelKey ){
      return rscratch( 'labelWrapCachedText' );
    }

    let zwsp = '\u200b';
    let lines = text.split('\n');
    let maxW = ele.pstyle('text-max-width').pfValue;
    let overflow = ele.pstyle('text-overflow-wrap').value;
    let overflowAny = overflow === 'anywhere';
    let wrappedLines = [];
    let separatorRegex = /[\s\u200b]+|$/g; // Include end of string to add last word

    for( let l = 0; l < lines.length; l++ ){
      let line = lines[ l ];

      let lineDims = this.calculateLabelDimensions( ele, line );
      let lineW = lineDims.width;

      if( overflowAny ){
        let processedLine = line.split('').join(zwsp);

        line = processedLine;
      }

      if( lineW > maxW ){ // line is too long
        let separatorMatches = line.matchAll(separatorRegex);
        let subline = '';

        let previousIndex = 0;
        // Add fake match
        for( let separatorMatch of separatorMatches ){
          let wordSeparator = separatorMatch[ 0 ];
          let word = line.substring( previousIndex, separatorMatch.index );
          previousIndex = separatorMatch.index + wordSeparator.length;

          let testLine = subline.length === 0 ? word : subline + word + wordSeparator;
          let testDims = this.calculateLabelDimensions( ele, testLine );
          let testW = testDims.width;

          if( testW <= maxW ){ // word fits on current line
            subline += word + wordSeparator;
          } else { // word starts new line
            if( subline ){
              wrappedLines.push( subline );
            }
            subline = word + wordSeparator;
          }
        }

        // if there's remaining text, put it in a wrapped line
        if( !subline.match( /^[\s\u200b]+$/ ) ){
          wrappedLines.push( subline );
        }
      } else { // line is already short enough
        wrappedLines.push( line );
      }
    } // for

    rscratch( 'labelWrapCachedLines', wrappedLines );
    text = rscratch( 'labelWrapCachedText', wrappedLines.join( '\n' ) );
    rscratch( 'labelWrapKey', labelKey );

  } else if( wrapStyle === 'ellipsis' ){
    let maxW = ele.pstyle( 'text-max-width' ).pfValue;
    let ellipsized = '';
    let ellipsis = '\u2026';
    let incLastCh = false;

    if (this.calculateLabelDimensions(ele, text).width < maxW) { // the label already fits
      return text;
    }

    for( let i = 0; i < text.length; i++ ){
      let widthWithNextCh = this.calculateLabelDimensions( ele, ellipsized + text[i] + ellipsis ).width;

      if( widthWithNextCh > maxW ){ break; }

      ellipsized += text[i];

      if( i === text.length - 1 ){ incLastCh = true; }
    }

    if( !incLastCh ){
      ellipsized += ellipsis;
    }

    return ellipsized;
  } // if ellipsize

  return text;
};

BRp.getLabelJustification = function(ele){
  let justification = ele.pstyle('text-justification').strValue;
  let textHalign = ele.pstyle('text-halign').strValue;

  if( justification === 'auto' ){
    if( ele.isNode() ){
      switch( textHalign ){
        case 'left':
          return 'right';
        case 'right':
          return 'left';
        default:
          return 'center';
      }
    } else {
      return 'center';
    }
  } else {
    return justification;
  }
};

BRp.calculateLabelDimensions = function( ele, text ){
  let r = this;

  var containerWindow = r.cy.window();

  var document = containerWindow.document;

  let padding = 0; // add padding around text dims, as the measurement isn't that accurate
  let fStyle = ele.pstyle('font-style').strValue;
  let size = ele.pstyle('font-size').pfValue;
  let family = ele.pstyle('font-family').strValue;
  let weight = ele.pstyle('font-weight').strValue;

  let canvas = this.labelCalcCanvas;
  let c2d = this.labelCalcCanvasContext;

  if( !canvas ){
    canvas = this.labelCalcCanvas = document.createElement('canvas');
    c2d = this.labelCalcCanvasContext = canvas.getContext('2d');

    let ds = canvas.style;
    ds.position = 'absolute';
    ds.left = '-9999px';
    ds.top = '-9999px';
    ds.zIndex = '-1';
    ds.visibility = 'hidden';
    ds.pointerEvents = 'none';
  }

  c2d.font = `${fStyle} ${weight} ${size}px ${family}`;

  let width = 0;
  let height = 0;
  let lines = text.split('\n');

  for( let i = 0; i < lines.length; i++ ){
    let line = lines[i];
    let metrics = c2d.measureText(line);
    let w = Math.ceil(metrics.width);
    let h = size;

    width = Math.max(w, width);
    height += h;
  }

  width += padding;
  height += padding;

  return {
    width,
    height
  };
};

BRp.calculateLabelAngle = function( ele, prefix ){
  let _p = ele._private;
  let rs = _p.rscratch;
  let isEdge = ele.isEdge();
  let prefixDash = prefix ? prefix + '-' : '';
  let rot = ele.pstyle( prefixDash + 'text-rotation' );
  let rotStr = rot.strValue;

  if( rotStr === 'none' ){
    return 0;
  } else if( isEdge && rotStr === 'autorotate' ){
    return rs.labelAutoAngle;
  } else if( rotStr === 'autorotate' ){
    return 0;
  } else {
    return rot.pfValue;
  }
};

BRp.calculateLabelAngles = function( ele ){
  let r = this;
  let isEdge = ele.isEdge();
  let _p = ele._private;
  let rs = _p.rscratch;

  rs.labelAngle = r.calculateLabelAngle(ele);

  if( isEdge ){
    rs.sourceLabelAngle = r.calculateLabelAngle(ele, 'source');
    rs.targetLabelAngle = r.calculateLabelAngle(ele, 'target');
  }
};

export default BRp;
