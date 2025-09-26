import * as is from '../../is.mjs';

function getEasedValue( type, start, end, percent, easingFn ){
  if( percent === 1 ){
    return end;
  }

  if( start === end ){
    return end;
  }

  let val = easingFn( start, end, percent );

  if( type == null ){
    return val;
  }

  if( type.roundValue || type.color ){
    val = Math.round( val );
  }

  if( type.min !== undefined ){
    val = Math.max( val, type.min );
  }

  if( type.max !== undefined ){
    val = Math.min( val, type.max );
  }

  return val;
}

function getValue( prop, spec ){
  if( prop.pfValue != null || prop.value != null ){
    if( prop.pfValue != null && (spec == null || spec.type.units !== '%') ){
      return prop.pfValue;
    } else {
      return prop.value;
    }
  } else {
    return prop;
  }
}

function ease( startProp, endProp, percent, easingFn, propSpec ){
  let type = propSpec != null ? propSpec.type : null;

  if( percent < 0 ){
    percent = 0;
  } else if( percent > 1 ){
    percent = 1;
  }

  let start = getValue( startProp, propSpec );
  let end = getValue( endProp, propSpec );

  if( is.number( start ) && is.number( end ) ){
    return getEasedValue( type, start, end, percent, easingFn );

  } else if( is.array( start ) && is.array( end ) ){
    let easedArr = [];

    for( let i = 0; i < end.length; i++ ){
      let si = start[ i ];
      let ei = end[ i ];

      if( si != null && ei != null ){
        let val = getEasedValue( type, si, ei, percent, easingFn );

        easedArr.push( val );
      } else {
        easedArr.push( ei );
      }
    }

    return easedArr;
  }

  return undefined;
}

export default ease;
