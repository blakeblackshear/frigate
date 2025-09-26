import * as util from '../util/index.mjs';
import * as is from '../is.mjs';

let styfn = {};

// gets the rendered style for an element
styfn.getRenderedStyle = function( ele, prop ){
  if( prop ){
    return this.getStylePropertyValue( ele, prop, true );
  } else {
    return this.getRawStyle( ele, true );
  }
};

// gets the raw style for an element
styfn.getRawStyle = function( ele, isRenderedVal ){
  let self = this;

  ele = ele[0]; // insure it's an element

  if( ele ){
    let rstyle = {};

    for( let i = 0; i < self.properties.length; i++ ){
      let prop = self.properties[ i ];
      let val = self.getStylePropertyValue( ele, prop.name, isRenderedVal );

      if( val != null ){
        rstyle[ prop.name ] = val;
        rstyle[ util.dash2camel( prop.name ) ] = val;
      }
    }

    return rstyle;
  }
};

styfn.getIndexedStyle = function( ele, property, subproperty, index ){
  let pstyle = ele.pstyle( property )[subproperty][index];
  return pstyle != null ? pstyle : ele.cy().style().getDefaultProperty( property )[subproperty][0];
};

styfn.getStylePropertyValue = function( ele, propName, isRenderedVal ){
  let self = this;

  ele = ele[0]; // insure it's an element

  if( ele ){
    let prop = self.properties[ propName ];

    if( prop.alias ){
      prop = prop.pointsTo;
    }

    let type = prop.type;
    let styleProp = ele.pstyle( prop.name );

    if( styleProp ){
      let { value, units, strValue } = styleProp;

      if( isRenderedVal && type.number && value != null && is.number(value) ){
        let zoom = ele.cy().zoom();
        let getRenderedValue = val => val * zoom;
        let getValueStringWithUnits = (val, units) => getRenderedValue(val) + units;
        let isArrayValue = is.array(value);
        let haveUnits = isArrayValue ? units.every(u => u != null) : units != null;

        if( haveUnits ){
          if( isArrayValue ){
            return value.map( (v, i) => getValueStringWithUnits(v, units[i]) ).join(' ');
          } else {
            return getValueStringWithUnits(value, units);
          }
        } else {
          if( isArrayValue ){
            return value.map(v => is.string(v) ? v : '' + getRenderedValue(v)).join(' ');
          } else {
            return '' + getRenderedValue(value);
          }
        }
      } else if( strValue != null ){
        return strValue;
      }
    }

    return null;
  }
};

styfn.getAnimationStartStyle = function( ele, aniProps ){
  let rstyle = {};

  for( let i = 0; i < aniProps.length; i++ ){
    let aniProp = aniProps[ i ];
    let name = aniProp.name;

    let styleProp = ele.pstyle( name );

    if( styleProp !== undefined ){ // then make a prop of it
      if( is.plainObject( styleProp ) ){
        styleProp = this.parse( name, styleProp.strValue );
      } else {
        styleProp = this.parse( name, styleProp );
      }
    }

    if( styleProp ){
      rstyle[ name ] = styleProp;
    }
  }

  return rstyle;
};

styfn.getPropsList = function( propsObj ){
  let self = this;
  let rstyle = [];
  let style = propsObj;
  let props = self.properties;

  if( style ){
    let names = Object.keys( style );

    for( let i = 0; i < names.length; i++ ){
      let name = names[i];
      let val = style[ name ];
      let prop = props[ name ] || props[ util.camel2dash( name ) ];
      let styleProp = this.parse( prop.name, val );

      if( styleProp ){
        rstyle.push( styleProp );
      }
    }
  }

  return rstyle;
};

styfn.getNonDefaultPropertiesHash = function( ele, propNames, seed ){
  let hash = seed.slice();
  let name, val, strVal, chVal;
  let i, j;

  for( i = 0; i < propNames.length; i++ ){
    name = propNames[i];
    val = ele.pstyle( name, false );

    if( val == null ){
      continue;
    } else if( val.pfValue != null ){
      hash[0] = util.hashInt( chVal, hash[0] );
      hash[1] = util.hashIntAlt( chVal, hash[1] );
    } else {
      strVal = val.strValue;

      for( j = 0; j < strVal.length; j++ ){
        chVal = strVal.charCodeAt(j);
        hash[0] = util.hashInt( chVal, hash[0] );
        hash[1] = util.hashIntAlt( chVal, hash[1] );
      }
    }
  }

  return hash;
};

styfn.getPropertiesHash = styfn.getNonDefaultPropertiesHash;

export default styfn;
