import * as math from '../../math.mjs';

const ifEdge = (ele, getValue) => {
  if( ele.isEdge() && ele.takesUpSpace() ){
    return getValue( ele );
  }
};

const ifEdgeRenderedPosition = (ele, getPoint) => {
  if( ele.isEdge() && ele.takesUpSpace() ){
    let cy = ele.cy();

    return math.modelToRenderedPosition( getPoint( ele ), cy.zoom(), cy.pan() );
  }
};

const ifEdgeRenderedPositions = (ele, getPoints) => {
  if( ele.isEdge() && ele.takesUpSpace() ){
    let cy = ele.cy();
    let pan = cy.pan();
    let zoom = cy.zoom();

    return getPoints( ele ).map( p => math.modelToRenderedPosition( p, zoom, pan ) );
  }
};

const controlPoints = ele => ele.renderer().getControlPoints( ele );
const segmentPoints = ele => ele.renderer().getSegmentPoints( ele );
const sourceEndpoint = ele => ele.renderer().getSourceEndpoint( ele );
const targetEndpoint = ele => ele.renderer().getTargetEndpoint( ele );
const midpoint = ele => ele.renderer().getEdgeMidpoint( ele );

const pts = {
  controlPoints: { get: controlPoints, mult: true },
  segmentPoints: { get: segmentPoints, mult: true },
  sourceEndpoint: { get: sourceEndpoint },
  targetEndpoint: { get: targetEndpoint },
  midpoint: { get: midpoint }
};

const renderedName = name => 'rendered' + name[0].toUpperCase() + name.substr(1);

export default Object.keys( pts ).reduce( ( obj, name ) => {
  let spec = pts[ name ];
  let rName = renderedName( name );

  obj[ name ] = function(){ return ifEdge( this, spec.get ); };

  if( spec.mult ){
    obj[ rName ] = function(){ return ifEdgeRenderedPositions( this, spec.get ); };
  } else {
    obj[ rName ] = function(){ return ifEdgeRenderedPosition( this, spec.get ); };
  }

  return obj;
}, {} );
