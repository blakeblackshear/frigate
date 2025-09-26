import * as util from '../util/index.mjs';
import * as is from '../is.mjs';

const styfn = {};

(function(){
  let number = util.regex.number;
  let rgba = util.regex.rgbaNoBackRefs;
  let hsla = util.regex.hslaNoBackRefs;
  let hex3 = util.regex.hex3;
  let hex6 = util.regex.hex6;
  let data = function( prefix ){ return '^' + prefix + '\\s*\\(\\s*([\\w\\.]+)\\s*\\)$'; };
  let mapData = function( prefix ){
    let mapArg = number + '|\\w+|' + rgba + '|' + hsla + '|' + hex3 + '|' + hex6;
    return '^' + prefix + '\\s*\\(([\\w\\.]+)\\s*\\,\\s*(' + number + ')\\s*\\,\\s*(' + number + ')\\s*,\\s*(' + mapArg + ')\\s*\\,\\s*(' + mapArg + ')\\)$';
  };
  let urlRegexes = [
    '^url\\s*\\(\\s*[\'"]?(.+?)[\'"]?\\s*\\)$',
    '^(none)$',
    '^(.+)$'
  ];

  // each visual style property has a type and needs to be validated according to it
  styfn.types = {
    time: { number: true, min: 0, units: 's|ms', implicitUnits: 'ms' },
    percent: { number: true, min: 0, max: 100, units: '%', implicitUnits: '%' },
    percentages: { number: true, min: 0, max: 100, units: '%', implicitUnits: '%', multiple: true },
    zeroOneNumber: { number: true, min: 0, max: 1, unitless: true },
    zeroOneNumbers: { number: true, min: 0, max: 1, unitless: true, multiple: true },
    nOneOneNumber: { number: true, min: -1, max: 1, unitless: true },
    nonNegativeInt: { number: true, min: 0, integer: true, unitless: true },
    nonNegativeNumber: { number: true, min: 0, unitless: true },
    position: { enums: [ 'parent', 'origin' ] },
    nodeSize: { number: true, min: 0, enums: [ 'label' ] },
    number: { number: true, unitless: true },
    numbers: { number: true, unitless: true, multiple: true },
    positiveNumber: { number: true, unitless: true, min: 0, strictMin: true },
    size: { number: true, min: 0 },
    bidirectionalSize: { number: true }, // allows negative
    bidirectionalSizeMaybePercent: { number: true, allowPercent: true }, // allows negative
    bidirectionalSizes: { number: true, multiple: true }, // allows negative
    sizeMaybePercent: { number: true, min: 0, allowPercent: true },
    axisDirection: { enums: ['horizontal', 'leftward', 'rightward', 'vertical', 'upward', 'downward', 'auto'] },
    axisDirectionExplicit: { enums: ['leftward', 'rightward', 'upward', 'downward'] },
    axisDirectionPrimary: { enums: ['horizontal', 'vertical'] },
    paddingRelativeTo: { enums: [ 'width', 'height', 'average', 'min', 'max' ] },
    bgWH: { number: true, min: 0, allowPercent: true, enums: [ 'auto' ], multiple: true },
    bgPos: { number: true, allowPercent: true, multiple: true },
    bgRelativeTo: { enums: [ 'inner', 'include-padding' ], multiple: true },
    bgRepeat: { enums: [ 'repeat', 'repeat-x', 'repeat-y', 'no-repeat' ], multiple: true },
    bgFit: { enums: [ 'none', 'contain', 'cover' ], multiple: true },
    bgCrossOrigin: { enums: [ 'anonymous', 'use-credentials', 'null' ], multiple: true },
    bgClip: { enums: [ 'none', 'node' ], multiple: true },
    bgContainment: { enums: [ 'inside', 'over' ], multiple: true },
    boxSelection: { enums: [ 'contain', 'overlap', 'none' ] },
    color: { color: true },
    colors: { color: true, multiple: true },
    fill: { enums: ['solid', 'linear-gradient', 'radial-gradient'] },
    bool: { enums: [ 'yes', 'no' ] },
    bools: { enums: [ 'yes', 'no' ], multiple: true },
    lineStyle: { enums: [ 'solid', 'dotted', 'dashed' ] },
    lineCap: { enums: [ 'butt', 'round', 'square' ] },
    linePosition: { enums: [ 'center', 'inside', 'outside' ] },
    lineJoin: { enums: [ 'round', 'bevel', 'miter' ] },
    borderStyle: { enums: [ 'solid', 'dotted', 'dashed', 'double' ] },
    curveStyle: { enums: [ 'bezier', 'unbundled-bezier', 'haystack', 'segments', 'straight', 'straight-triangle', 'taxi', 'round-segments', 'round-taxi' ] },
    radiusType: { enums: [ 'arc-radius', 'influence-radius' ] , multiple: true },
    fontFamily: { regex: '^([\\w- \\"]+(?:\\s*,\\s*[\\w- \\"]+)*)$' },
    fontStyle: { enums: [ 'italic', 'normal', 'oblique' ] },
    fontWeight: { enums: [ 'normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '800', '900', 100, 200, 300, 400, 500, 600, 700, 800, 900 ] },
    textDecoration: { enums: [ 'none', 'underline', 'overline', 'line-through' ] },
    textTransform: { enums: [ 'none', 'uppercase', 'lowercase' ] },
    textWrap: { enums: [ 'none', 'wrap', 'ellipsis' ] },
    textOverflowWrap: { enums: [ 'whitespace', 'anywhere' ] },
    textBackgroundShape: { enums: [ 'rectangle', 'roundrectangle', 'round-rectangle', 'circle' ]},
    nodeShape: { enums: [
      'rectangle', 'roundrectangle', 'round-rectangle', 'cutrectangle', 'cut-rectangle', 'bottomroundrectangle', 'bottom-round-rectangle', 'barrel',
      'ellipse', 'triangle', 'round-triangle', 'square', 'pentagon', 'round-pentagon', 'hexagon', 'round-hexagon', 'concavehexagon', 'concave-hexagon', 'heptagon', 'round-heptagon', 'octagon', 'round-octagon',
      'tag', 'round-tag', 'star', 'diamond', 'round-diamond', 'vee', 'rhomboid', 'right-rhomboid', 'polygon',
    ] },
    overlayShape: { enums: [ 'roundrectangle', 'round-rectangle', 'ellipse' ] },
    cornerRadius: { number: true, min: 0, units: 'px|em', implicitUnits: 'px', enums: ['auto'] },
    compoundIncludeLabels: { enums: [ 'include', 'exclude' ] },
    arrowShape: { enums: [ 'tee', 'triangle', 'triangle-tee', 'circle-triangle', 'triangle-cross', 'triangle-backcurve', 'vee', 'square', 'circle', 'diamond', 'chevron', 'none' ] },
    arrowFill: { enums: [ 'filled', 'hollow' ] },
    arrowWidth: { number: true, units: '%|px|em', implicitUnits: 'px', enums: [ 'match-line' ] },
    display: { enums: [ 'element', 'none' ] },
    visibility: { enums: [ 'hidden', 'visible' ] },
    zCompoundDepth: { enums: [ 'bottom', 'orphan', 'auto', 'top' ] },
    zIndexCompare: { enums: [ 'auto', 'manual' ] },
    valign: { enums: [ 'top', 'center', 'bottom' ] },
    halign: { enums: [ 'left', 'center', 'right' ] },
    justification: { enums: [ 'left', 'center', 'right', 'auto' ] },
    text: { string: true },
    data: { mapping: true, regex: data( 'data' ) },
    layoutData: { mapping: true, regex: data( 'layoutData' ) },
    scratch: { mapping: true, regex: data( 'scratch' ) },
    mapData: { mapping: true, regex: mapData( 'mapData' ) },
    mapLayoutData: { mapping: true, regex: mapData( 'mapLayoutData' ) },
    mapScratch: { mapping: true, regex: mapData( 'mapScratch' ) },
    fn: { mapping: true, fn: true },
    url: { regexes: urlRegexes, singleRegexMatchValue: true },
    urls: { regexes: urlRegexes, singleRegexMatchValue: true, multiple: true },
    propList: { propList: true },
    angle: { number: true, units: 'deg|rad', implicitUnits: 'rad' },
    textRotation: { number: true, units: 'deg|rad', implicitUnits: 'rad', enums: [ 'none', 'autorotate' ] },
    polygonPointList: { number: true, multiple: true, evenMultiple: true, min: -1, max: 1, unitless: true },
    edgeDistances: { enums: ['intersection', 'node-position', 'endpoints'] },
    edgeEndpoint: {
      number: true, multiple: true, units: '%|px|em|deg|rad', implicitUnits: 'px',
      enums: [ 'inside-to-node', 'outside-to-node', 'outside-to-node-or-label', 'outside-to-line', 'outside-to-line-or-label' ], singleEnum: true,
      validate: function( valArr, unitsArr ){
        switch( valArr.length ){
          case 2: // can be % or px only
            return unitsArr[0] !== 'deg' && unitsArr[0] !== 'rad' && unitsArr[1] !== 'deg' && unitsArr[1] !== 'rad';
          case 1: // can be enum, deg, or rad only
            return is.string( valArr[0] ) || unitsArr[0] === 'deg' || unitsArr[0] === 'rad';
          default:
            return false;
        }
      }
    },
    easing: {
      regexes: [
        '^(spring)\\s*\\(\\s*(' + number + ')\\s*,\\s*(' + number + ')\\s*\\)$',
        '^(cubic-bezier)\\s*\\(\\s*(' + number + ')\\s*,\\s*(' + number + ')\\s*,\\s*(' + number + ')\\s*,\\s*(' + number + ')\\s*\\)$'
      ],
      enums: [
        'linear',
        'ease', 'ease-in', 'ease-out', 'ease-in-out',
        'ease-in-sine', 'ease-out-sine', 'ease-in-out-sine',
        'ease-in-quad', 'ease-out-quad', 'ease-in-out-quad',
        'ease-in-cubic', 'ease-out-cubic', 'ease-in-out-cubic',
        'ease-in-quart', 'ease-out-quart', 'ease-in-out-quart',
        'ease-in-quint', 'ease-out-quint', 'ease-in-out-quint',
        'ease-in-expo', 'ease-out-expo', 'ease-in-out-expo',
        'ease-in-circ', 'ease-out-circ', 'ease-in-out-circ'
      ]
    },
    gradientDirection: { enums: [
      'to-bottom', 'to-top', 'to-left', 'to-right',
      'to-bottom-right', 'to-bottom-left', 'to-top-right', 'to-top-left',
      'to-right-bottom', 'to-left-bottom', 'to-right-top', 'to-left-top', // different order
    ] },
    boundsExpansion: {
      number:true,
      multiple:true,
      min: 0,
      validate: function( valArr ) {
        const length = valArr.length;

        return length === 1 || length === 2 || length === 4;
      }
    },
  };

  let diff = {
    zeroNonZero: function( val1, val2 ){
      if( ( val1 == null || val2 == null ) && val1 !== val2 ){
        return true; // null cases could represent any value
      } if( val1 == 0 && val2 != 0 ){
        return true;
      } else if( val1 != 0 && val2 == 0 ){
        return true;
      } else {
        return false;
      }
    },
    any: function( val1, val2 ){
      return val1 != val2;
    },
    emptyNonEmpty: function( str1, str2 ){
      const empty1 = is.emptyString(str1);
      const empty2 = is.emptyString(str2);

      return (empty1 && !empty2) || (!empty1 && empty2);
    }
  };

  // define visual style properties
  //
  // - n.b. adding a new group of props may require updates to updateStyleHints()
  // - adding new props to an existing group gets handled automatically

  let t = styfn.types;

  let mainLabel = [
    { name: 'label', type: t.text, triggersBounds: diff.any, triggersZOrder: diff.emptyNonEmpty },
    { name: 'text-rotation', type: t.textRotation, triggersBounds: diff.any },
    { name: 'text-margin-x', type: t.bidirectionalSize, triggersBounds: diff.any },
    { name: 'text-margin-y', type: t.bidirectionalSize, triggersBounds: diff.any }
  ];

  let sourceLabel = [
    { name: 'source-label', type: t.text, triggersBounds: diff.any },
    { name: 'source-text-rotation', type: t.textRotation, triggersBounds: diff.any },
    { name: 'source-text-margin-x', type: t.bidirectionalSize, triggersBounds: diff.any },
    { name: 'source-text-margin-y', type: t.bidirectionalSize, triggersBounds: diff.any },
    { name: 'source-text-offset', type: t.size, triggersBounds: diff.any }
  ];

  let targetLabel = [
    { name: 'target-label', type: t.text, triggersBounds: diff.any },
    { name: 'target-text-rotation', type: t.textRotation, triggersBounds: diff.any },
    { name: 'target-text-margin-x', type: t.bidirectionalSize, triggersBounds: diff.any },
    { name: 'target-text-margin-y', type: t.bidirectionalSize, triggersBounds: diff.any },
    { name: 'target-text-offset', type: t.size, triggersBounds: diff.any }
  ];

  let labelDimensions = [
    { name: 'font-family', type: t.fontFamily, triggersBounds: diff.any },
    { name: 'font-style', type: t.fontStyle, triggersBounds: diff.any },
    { name: 'font-weight', type: t.fontWeight, triggersBounds: diff.any },
    { name: 'font-size', type: t.size, triggersBounds: diff.any },
    { name: 'text-transform', type: t.textTransform, triggersBounds: diff.any },
    { name: 'text-wrap', type: t.textWrap, triggersBounds: diff.any },
    { name: 'text-overflow-wrap', type: t.textOverflowWrap, triggersBounds: diff.any },
    { name: 'text-max-width', type: t.size, triggersBounds: diff.any },
    { name: 'text-outline-width', type: t.size, triggersBounds: diff.any },
    { name: 'line-height', type: t.positiveNumber, triggersBounds: diff.any }
  ];

  let commonLabel = [
    { name: 'text-valign', type: t.valign, triggersBounds: diff.any },
    { name: 'text-halign', type: t.halign, triggersBounds: diff.any },
    { name: 'color', type: t.color },
    { name: 'text-outline-color', type: t.color },
    { name: 'text-outline-opacity', type: t.zeroOneNumber },
    { name: 'text-background-color', type: t.color },
    { name: 'text-background-opacity', type: t.zeroOneNumber },
    { name: 'text-background-padding', type: t.size, triggersBounds: diff.any },
    { name: 'text-border-opacity', type: t.zeroOneNumber },
    { name: 'text-border-color', type: t.color },
    { name: 'text-border-width', type: t.size, triggersBounds: diff.any },
    { name: 'text-border-style', type: t.borderStyle, triggersBounds: diff.any },
    { name: 'text-background-shape', type: t.textBackgroundShape, triggersBounds: diff.any },
    { name: 'text-justification', type: t.justification },
    { name: 'box-select-labels', type: t.bool, triggersBounds: diff.any },
  ];

  let behavior = [
    { name: 'events', type: t.bool, triggersZOrder: diff.any },
    { name: 'text-events', type: t.bool, triggersZOrder: diff.any },
    { name: 'box-selection', type: t.boxSelection, triggersZOrder: diff.any },
  ];

  let visibility = [
    {
      name: 'display',
      type: t.display, 
      triggersZOrder: diff.any, 
      triggersBounds: diff.any, 
      triggersBoundsOfConnectedEdges: diff.any,
      triggersBoundsOfParallelEdges: (fromValue, toValue, ele) => {
        if (fromValue === toValue) { return false; }

        // only if edge is bundled bezier (so as not to affect performance of other edges)
        return ele.pstyle('curve-style').value === 'bezier';
      }
    },
    { name: 'visibility', type: t.visibility, triggersZOrder: diff.any },
    { name: 'opacity', type: t.zeroOneNumber, triggersZOrder: diff.zeroNonZero },
    { name: 'text-opacity', type: t.zeroOneNumber },
    { name: 'min-zoomed-font-size', type: t.size },
    { name: 'z-compound-depth', type: t.zCompoundDepth, triggersZOrder: diff.any },
    { name: 'z-index-compare', type: t.zIndexCompare, triggersZOrder: diff.any },
    { name: 'z-index', type: t.number, triggersZOrder: diff.any }
  ];

  let overlay = [
    { name: 'overlay-padding', type: t.size, triggersBounds: diff.any },
    { name: 'overlay-color', type: t.color },
    { name: 'overlay-opacity', type: t.zeroOneNumber, triggersBounds: diff.zeroNonZero },
    { name: 'overlay-shape', type: t.overlayShape, triggersBounds: diff.any },
    { name: 'overlay-corner-radius', type: t.cornerRadius }
  ];

  let underlay = [
    { name: 'underlay-padding', type: t.size, triggersBounds: diff.any },
    { name: 'underlay-color', type: t.color },
    { name: 'underlay-opacity', type: t.zeroOneNumber, triggersBounds: diff.zeroNonZero },
    { name: 'underlay-shape', type: t.overlayShape, triggersBounds: diff.any },
    { name: 'underlay-corner-radius', type: t.cornerRadius }
  ];

  let transition = [
    { name: 'transition-property', type: t.propList },
    { name: 'transition-duration', type: t.time },
    { name: 'transition-delay', type: t.time },
    { name: 'transition-timing-function', type: t.easing }
  ];

  let nodeSizeHashOverride = (ele, parsedProp) => {
    if( parsedProp.value === 'label' ){
      return -ele.poolIndex(); // no hash key hits is using label size (hitrate for perf probably low anyway)
    } else {
      return parsedProp.pfValue;
    }
  };

  let nodeBody = [
    { name: 'height', type: t.nodeSize, triggersBounds: diff.any, hashOverride: nodeSizeHashOverride },
    { name: 'width', type: t.nodeSize, triggersBounds: diff.any, hashOverride: nodeSizeHashOverride },
    { name: 'shape', type: t.nodeShape, triggersBounds: diff.any },
    { name: 'shape-polygon-points', type: t.polygonPointList, triggersBounds: diff.any },
    { name: 'corner-radius', type: t.cornerRadius},
    { name: 'background-color', type: t.color },
    { name: 'background-fill', type: t.fill },
    { name: 'background-opacity', type: t.zeroOneNumber },
    { name: 'background-blacken', type: t.nOneOneNumber },
    { name: 'background-gradient-stop-colors', type: t.colors },
    { name: 'background-gradient-stop-positions', type: t.percentages },
    { name: 'background-gradient-direction', type: t.gradientDirection },
    { name: 'padding', type: t.sizeMaybePercent, triggersBounds: diff.any },
    { name: 'padding-relative-to', type: t.paddingRelativeTo, triggersBounds: diff.any },
    { name: 'bounds-expansion', type: t.boundsExpansion, triggersBounds: diff.any }
  ];

  let nodeBorder = [
    { name: 'border-color', type: t.color },
    { name: 'border-opacity', type: t.zeroOneNumber },
    { name: 'border-width', type: t.size, triggersBounds: diff.any },
    { name: 'border-style', type: t.borderStyle },
    { name: 'border-cap', type: t.lineCap },
    { name: 'border-join', type: t.lineJoin },
    { name: 'border-dash-pattern', type: t.numbers },
    { name: 'border-dash-offset', type: t.number },
    { name: 'border-position', type: t.linePosition },
  ];

  let nodeOutline = [
    { name: 'outline-color', type: t.color },
    { name: 'outline-opacity', type: t.zeroOneNumber },
    { name: 'outline-width', type: t.size, triggersBounds: diff.any },
    { name: 'outline-style', type: t.borderStyle },
    { name: 'outline-offset', type: t.size, triggersBounds: diff.any }
  ];

  let backgroundImage = [
    { name: 'background-image', type: t.urls },
    { name: 'background-image-crossorigin', type: t.bgCrossOrigin },
    { name: 'background-image-opacity', type: t.zeroOneNumbers },
    { name: 'background-image-containment', type: t.bgContainment }, 
    { name: 'background-image-smoothing', type: t.bools },
    { name: 'background-position-x', type: t.bgPos },
    { name: 'background-position-y', type: t.bgPos },
    { name: 'background-width-relative-to', type: t.bgRelativeTo },
    { name: 'background-height-relative-to', type: t.bgRelativeTo },
    { name: 'background-repeat', type: t.bgRepeat },
    { name: 'background-fit', type: t.bgFit },
    { name: 'background-clip', type: t.bgClip },
    { name: 'background-width', type: t.bgWH },
    { name: 'background-height', type: t.bgWH },
    { name: 'background-offset-x', type: t.bgPos },
    { name: 'background-offset-y', type: t.bgPos }
  ];

  let compound = [
    { name: 'position', type: t.position, triggersBounds: diff.any },
    { name: 'compound-sizing-wrt-labels', type: t.compoundIncludeLabels, triggersBounds: diff.any },
    { name: 'min-width', type: t.size, triggersBounds: diff.any },
    { name: 'min-width-bias-left', type: t.sizeMaybePercent, triggersBounds: diff.any },
    { name: 'min-width-bias-right', type: t.sizeMaybePercent, triggersBounds: diff.any },
    { name: 'min-height', type: t.size, triggersBounds: diff.any },
    { name: 'min-height-bias-top', type: t.sizeMaybePercent, triggersBounds: diff.any },
    { name: 'min-height-bias-bottom', type: t.sizeMaybePercent, triggersBounds: diff.any }
  ];

  let edgeLine = [
    { name: 'line-style', type: t.lineStyle },
    { name: 'line-color', type: t.color },
    { name: 'line-fill', type: t.fill },
    { name: 'line-cap', type: t.lineCap },
    { name: 'line-opacity', type: t.zeroOneNumber},
    { name: 'line-dash-pattern', type: t.numbers },
    { name: 'line-dash-offset', type: t.number },
    { name: 'line-outline-width', type: t.size },
    { name: 'line-outline-color', type: t.color },
    { name: 'line-gradient-stop-colors', type: t.colors },
    { name: 'line-gradient-stop-positions', type: t.percentages },
    {
      name: 'curve-style',
      type: t.curveStyle,
      triggersBounds: diff.any,
      triggersBoundsOfParallelEdges: (fromValue, toValue) => {
        if (fromValue === toValue) { return false; } // must have diff

        return (
          fromValue === 'bezier' || // remove from bundle
          toValue === 'bezier'); // add to bundle
     }
    },
    { name: 'haystack-radius', type: t.zeroOneNumber, triggersBounds: diff.any },
    { name: 'source-endpoint', type: t.edgeEndpoint, triggersBounds: diff.any },
    { name: 'target-endpoint', type: t.edgeEndpoint, triggersBounds: diff.any },
    { name: 'control-point-step-size', type: t.size, triggersBounds: diff.any },
    { name: 'control-point-distances', type: t.bidirectionalSizes, triggersBounds: diff.any },
    { name: 'control-point-weights', type: t.numbers, triggersBounds: diff.any },
    { name: 'segment-distances', type: t.bidirectionalSizes, triggersBounds: diff.any },
    { name: 'segment-weights', type: t.numbers, triggersBounds: diff.any },
    { name: 'segment-radii', type: t.numbers, triggersBounds: diff.any },
    { name: 'radius-type', type: t.radiusType, triggersBounds: diff.any },
    { name: 'taxi-turn', type: t.bidirectionalSizeMaybePercent, triggersBounds: diff.any },
    { name: 'taxi-turn-min-distance', type: t.size, triggersBounds: diff.any },
    { name: 'taxi-direction', type: t.axisDirection, triggersBounds: diff.any },
    { name: 'taxi-radius', type: t.number, triggersBounds: diff.any },
    { name: 'edge-distances', type: t.edgeDistances, triggersBounds: diff.any },
    { name: 'arrow-scale', type: t.positiveNumber, triggersBounds: diff.any },
    { name: 'loop-direction', type: t.angle, triggersBounds: diff.any },
    { name: 'loop-sweep', type: t.angle, triggersBounds: diff.any },
    { name: 'source-distance-from-node', type: t.size, triggersBounds: diff.any },
    { name: 'target-distance-from-node', type: t.size, triggersBounds: diff.any },
  ];

  let ghost = [
    { name: 'ghost', type: t.bool, triggersBounds: diff.any },
    { name: 'ghost-offset-x', type: t.bidirectionalSize, triggersBounds: diff.any },
    { name: 'ghost-offset-y', type: t.bidirectionalSize, triggersBounds: diff.any },
    { name: 'ghost-opacity', type: t.zeroOneNumber }
  ];

  let core = [
    { name: 'selection-box-color', type: t.color },
    { name: 'selection-box-opacity', type: t.zeroOneNumber },
    { name: 'selection-box-border-color', type: t.color },
    { name: 'selection-box-border-width', type: t.size },
    { name: 'active-bg-color', type: t.color },
    { name: 'active-bg-opacity', type: t.zeroOneNumber },
    { name: 'active-bg-size', type: t.size },
    { name: 'outside-texture-bg-color', type: t.color },
    { name: 'outside-texture-bg-opacity', type: t.zeroOneNumber }
  ];

  // pie backgrounds for nodes
  let pie = [];
  styfn.pieBackgroundN = 16; // because the pie properties are numbered, give access to a constant N (for renderer use)
  pie.push( { name: 'pie-size', type: t.sizeMaybePercent } );
  pie.push( { name: 'pie-hole', type: t.sizeMaybePercent } );
  pie.push( { name: 'pie-start-angle', type: t.angle } );
  for( let i = 1; i <= styfn.pieBackgroundN; i++ ){
    pie.push( { name: 'pie-' + i + '-background-color', type: t.color } );
    pie.push( { name: 'pie-' + i + '-background-size', type: t.percent } );
    pie.push( { name: 'pie-' + i + '-background-opacity', type: t.zeroOneNumber } );
  }

  // stripe backgrounds for nodes
  let stripe = [];
  styfn.stripeBackgroundN = 16; // because the stripe properties are numbered, give access to a constant N (for renderer use)
  stripe.push( { name: 'stripe-size', type: t.sizeMaybePercent } );
  stripe.push( { name: 'stripe-direction', type: t.axisDirectionPrimary } );
  for( let i = 1; i <= styfn.stripeBackgroundN; i++ ){
    stripe.push( { name: 'stripe-' + i + '-background-color', type: t.color } );
    stripe.push( { name: 'stripe-' + i + '-background-size', type: t.percent } );
    stripe.push( { name: 'stripe-' + i + '-background-opacity', type: t.zeroOneNumber } );
  }

  // edge arrows
  let edgeArrow = [];
  let arrowPrefixes = styfn.arrowPrefixes = [ 'source', 'mid-source', 'target', 'mid-target' ];
  [
    { name: 'arrow-shape', type: t.arrowShape, triggersBounds: diff.any },
    { name: 'arrow-color', type: t.color },
    { name: 'arrow-fill', type: t.arrowFill },
    { name: 'arrow-width', type: t.arrowWidth }
  ].forEach( function( prop ){
    arrowPrefixes.forEach( function( prefix ){
      let name = prefix + '-' + prop.name;
      let { type, triggersBounds } = prop;

      edgeArrow.push( { name, type, triggersBounds } );
    } );
  }, {} );

  let props = styfn.properties = [
    // common to all eles
    ...behavior,
    ...transition,
    ...visibility,
    ...overlay,
    ...underlay,
    ...ghost,

    // labels
    ...commonLabel,
    ...labelDimensions,
    ...mainLabel,
    ...sourceLabel,
    ...targetLabel,

    // node props
    ...nodeBody,
    ...nodeBorder,
    ...nodeOutline,
    ...backgroundImage,
    ...pie,
    ...stripe,
    ...compound,

    // edge props
    ...edgeLine,
    ...edgeArrow,

    ...core
  ];

  let propGroups = styfn.propertyGroups = {
    // common to all eles
    behavior,
    transition,
    visibility,
    overlay,
    underlay,
    ghost,

    // labels
    commonLabel,
    labelDimensions,
    mainLabel,
    sourceLabel,
    targetLabel,

    // node props
    nodeBody,
    nodeBorder,
    nodeOutline,
    backgroundImage,
    pie,
    stripe,
    compound,

    // edge props
    edgeLine,
    edgeArrow,

    core
  };

  let propGroupNames = styfn.propertyGroupNames = {};

  let propGroupKeys = styfn.propertyGroupKeys = Object.keys( propGroups );

  propGroupKeys.forEach( key => {
    propGroupNames[ key ] = propGroups[ key ].map( prop => prop.name );

    propGroups[ key ].forEach( prop => prop.groupKey = key );
  } );

  // define aliases
  let aliases = styfn.aliases = [
    { name: 'content', pointsTo: 'label' },
    { name: 'control-point-distance', pointsTo: 'control-point-distances' },
    { name: 'control-point-weight', pointsTo: 'control-point-weights' },
    { name: 'segment-distance', pointsTo: 'segment-distances' },
    { name: 'segment-weight', pointsTo: 'segment-weights' },
    { name: 'segment-radius', pointsTo: 'segment-radii' },
    { name: 'edge-text-rotation', pointsTo: 'text-rotation' },
    { name: 'padding-left', pointsTo: 'padding' },
    { name: 'padding-right', pointsTo: 'padding' },
    { name: 'padding-top', pointsTo: 'padding' },
    { name: 'padding-bottom', pointsTo: 'padding' }
  ];

  // list of property names
  styfn.propertyNames = props.map( function( p ){ return p.name; } );

  // allow access of properties by name ( e.g. style.properties.height )
  for( let i = 0; i < props.length; i++ ){
    let prop = props[ i ];

    props[ prop.name ] = prop; // allow lookup by name
  }

  // map aliases
  for( let i = 0; i < aliases.length; i++ ){
    let alias = aliases[ i ];
    let pointsToProp = props[ alias.pointsTo ];
    let aliasProp = {
      name: alias.name,
      alias: true,
      pointsTo: pointsToProp
    };

    // add alias prop for parsing
    props.push( aliasProp );

    props[ alias.name ] = aliasProp; // allow lookup by name
  }
})();

styfn.getDefaultProperty = function( name ){
  return this.getDefaultProperties()[ name ];
};

styfn.getDefaultProperties = function(){
  let _p = this._private;

  if( _p.defaultProperties != null ){
    return _p.defaultProperties;
  }

  let rawProps = util.extend( {
    // core props
    'selection-box-color': '#ddd',
    'selection-box-opacity': 0.65,
    'selection-box-border-color': '#aaa',
    'selection-box-border-width': 1,
    'active-bg-color': 'black',
    'active-bg-opacity': 0.15,
    'active-bg-size': 30,
    'outside-texture-bg-color': '#000',
    'outside-texture-bg-opacity': 0.125,

    // common node/edge props
    'events': 'yes',
    'text-events': 'no',
    'text-valign': 'top',
    'text-halign': 'center',
    'text-justification': 'auto',
    'line-height': 1,
    'color': '#000',
    'box-selection': 'contain',
    'text-outline-color': '#000',
    'text-outline-width': 0,
    'text-outline-opacity': 1,
    'text-opacity': 1,
    'text-decoration': 'none',
    'text-transform': 'none',
    'text-wrap': 'none',
    'text-overflow-wrap': 'whitespace',
    'text-max-width': 9999,
    'text-background-color': '#000',
    'text-background-opacity': 0,
    'text-background-shape': 'rectangle',
    'text-background-padding': 0,
    'text-border-opacity': 0,
    'text-border-width': 0,
    'text-border-style': 'solid',
    'text-border-color': '#000',
    'font-family': 'Helvetica Neue, Helvetica, sans-serif',
    'font-style': 'normal',
    'font-weight': 'normal',
    'font-size': 16,
    'min-zoomed-font-size': 0,
    'text-rotation': 'none',
    'source-text-rotation': 'none',
    'target-text-rotation': 'none',
    'visibility': 'visible',
    'display': 'element',
    'opacity': 1,
    'z-compound-depth': 'auto',
    'z-index-compare': 'auto',
    'z-index': 0,
    'label': '',
    'text-margin-x': 0,
    'text-margin-y': 0,
    'source-label': '',
    'source-text-offset': 0,
    'source-text-margin-x': 0,
    'source-text-margin-y': 0,
    'target-label': '',
    'target-text-offset': 0,
    'target-text-margin-x': 0,
    'target-text-margin-y': 0,
    'overlay-opacity': 0,
    'overlay-color': '#000',
    'overlay-padding': 10,
    'overlay-shape': 'round-rectangle',
    'overlay-corner-radius': 'auto',
    'underlay-opacity': 0,
    'underlay-color': '#000',
    'underlay-padding': 10,
    'underlay-shape': 'round-rectangle',
    'underlay-corner-radius': 'auto',
    'transition-property': 'none',
    'transition-duration': 0,
    'transition-delay': 0,
    'transition-timing-function': 'linear',
    'box-select-labels': 'no',

    // node props
    'background-blacken': 0,
    'background-color': '#999',
    'background-fill': 'solid',
    'background-opacity': 1,
    'background-image': 'none',
    'background-image-crossorigin': 'anonymous',
    'background-image-opacity': 1,
    'background-image-containment': 'inside',
    'background-image-smoothing': 'yes',
    'background-position-x': '50%',
    'background-position-y': '50%',
    'background-offset-x': 0,
    'background-offset-y': 0,
    'background-width-relative-to': 'include-padding',
    'background-height-relative-to': 'include-padding',
    'background-repeat': 'no-repeat',
    'background-fit': 'none',
    'background-clip': 'node',
    'background-width': 'auto',
    'background-height': 'auto',
    'border-color': '#000',
    'border-opacity': 1,
    'border-width': 0,
    'border-style': 'solid',
    'border-dash-pattern': [ 4, 2 ],
    'border-dash-offset': 0,
    'border-cap': 'butt',
    'border-join': 'miter',
    'border-position': 'center',
    'outline-color': '#999',
    'outline-opacity': 1,
    'outline-width': 0,
    'outline-offset': 0,
    'outline-style': 'solid',
    'height': 30,
    'width': 30,
    'shape': 'ellipse',
    'shape-polygon-points': '-1, -1,   1, -1,   1, 1,   -1, 1',
    'corner-radius': 'auto',
    'bounds-expansion': 0,

    // node gradient
    'background-gradient-direction': 'to-bottom',
    'background-gradient-stop-colors': '#999',
    'background-gradient-stop-positions': '0%',

    // ghost props
    'ghost': 'no',
    'ghost-offset-y': 0,
    'ghost-offset-x': 0,
    'ghost-opacity': 0,

    // compound props
    'padding': 0,
    'padding-relative-to': 'width',
    'position': 'origin',
    'compound-sizing-wrt-labels': 'include',
    'min-width': 0,
    'min-width-bias-left': 0,
    'min-width-bias-right': 0,
    'min-height': 0,
    'min-height-bias-top': 0,
    'min-height-bias-bottom': 0
  }, {
    // node pie bg
    'pie-size': '100%',
    'pie-hole': 0,
    'pie-start-angle': '0deg',
  }, [
    { name: 'pie-{{i}}-background-color', value: 'black' },
    { name: 'pie-{{i}}-background-size', value: '0%' },
    { name: 'pie-{{i}}-background-opacity', value: 1 }
  ].reduce( function( css, prop ){
    for( let i = 1; i <= styfn.pieBackgroundN; i++ ){
      let name = prop.name.replace( '{{i}}', i );
      let val = prop.value;

      css[ name ] = val;
    }

    return css;
  }, {} ), {
    // node stripes bg
    'stripe-size': '100%',
    'stripe-direction': 'horizontal',
  }, [
    { name: 'stripe-{{i}}-background-color', value: 'black' },
    { name: 'stripe-{{i}}-background-size', value: '0%' },
    { name: 'stripe-{{i}}-background-opacity', value: 1 }
  ].reduce( function( css, prop ){
    for( let i = 1; i <= styfn.stripeBackgroundN; i++ ){
      let name = prop.name.replace( '{{i}}', i );
      let val = prop.value;

      css[ name ] = val;
    }

    return css;
  }, {} ), {
    // edge props
    'line-style': 'solid',
    'line-color': '#999',
    'line-fill': 'solid',
    'line-cap': 'butt',
    'line-opacity' : 1,
    'line-outline-width' : 0,
    'line-outline-color' : '#000',
    'line-gradient-stop-colors': '#999',
    'line-gradient-stop-positions': '0%',
    'control-point-step-size': 40,
    'control-point-weights': 0.5,
    'segment-weights': 0.5,
    'segment-distances': 20,
    'segment-radii': 15,
    'radius-type': 'arc-radius',
    'taxi-turn': '50%',
    'taxi-radius': 15,
    'taxi-turn-min-distance': 10,
    'taxi-direction': 'auto',
    'edge-distances': 'intersection',
    'curve-style': 'haystack',
    'haystack-radius': 0,
    'arrow-scale': 1,
    'loop-direction': '-45deg',
    'loop-sweep': '-90deg',
    'source-distance-from-node': 0,
    'target-distance-from-node': 0,
    'source-endpoint': 'outside-to-node',
    'target-endpoint': 'outside-to-node',
    'line-dash-pattern': [6, 3],
    'line-dash-offset': 0,
  }, [
    { name: 'arrow-shape', value: 'none' },
    { name: 'arrow-color', value: '#999' },
    { name: 'arrow-fill', value: 'filled' },
    { name: 'arrow-width', value: 1 },
  ].reduce( function( css, prop ){
    styfn.arrowPrefixes.forEach( function( prefix ){
      let name = prefix + '-' + prop.name;
      let val = prop.value;

      css[ name ] = val;
    } );

    return css;
  }, {} ) );

  let parsedProps = {};

  for( let i = 0; i < this.properties.length; i++ ){
    let prop = this.properties[i];

    if( prop.pointsTo ){ continue; }

    let name = prop.name;
    let val = rawProps[ name ];
    let parsedProp = this.parse( name, val );

    parsedProps[ name ] = parsedProp;
  }

  _p.defaultProperties = parsedProps;

  return _p.defaultProperties;
};

styfn.addDefaultStylesheet = function(){
  this
    .selector( ':parent' )
      .css( {
        'shape': 'rectangle',
        'padding': 10,
        'background-color': '#eee',
        'border-color': '#ccc',
        'border-width': 1
      } )
    .selector( 'edge' )
      .css( {
        'width': 3
      } )
    .selector( ':loop' )
      .css( {
        'curve-style': 'bezier'
      } )
    .selector( 'edge:compound' )
      .css( {
        'curve-style': 'bezier',
        'source-endpoint': 'outside-to-line',
        'target-endpoint': 'outside-to-line'
      } )
    .selector( ':selected' )
      .css( {
        'background-color': '#0169D9',
        'line-color': '#0169D9',
        'source-arrow-color': '#0169D9',
        'target-arrow-color': '#0169D9',
        'mid-source-arrow-color': '#0169D9',
        'mid-target-arrow-color': '#0169D9'
      } )
    .selector( ':parent:selected' )
      .css( {
        'background-color': '#CCE1F9',
        'border-color': '#aec8e5'
      } )
    .selector( ':active' )
      .css( {
        'overlay-color': 'black',
        'overlay-padding': 10,
        'overlay-opacity': 0.25
      } )
  ;

  this.defaultLength = this.length;
};

export default styfn;
