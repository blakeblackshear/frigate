import * as util from '../util/index.mjs';
import * as is from '../is.mjs';
import * as math from '../math.mjs';

let styfn = {};

// a caching layer for property parsing
styfn.parse = function( name, value, propIsBypass, propIsFlat ){
  let self = this;

  // function values can't be cached in all cases, and there isn't much benefit of caching them anyway
  if( is.fn( value ) ){
    return self.parseImplWarn( name, value, propIsBypass, propIsFlat );
  }

  let flatKey = ( propIsFlat === 'mapping' || propIsFlat === true || propIsFlat === false || propIsFlat == null ) ? 'dontcare' : propIsFlat;
  let bypassKey = propIsBypass ? 't' : 'f';
  let valueKey = '' + value;
  let argHash = util.hashStrings( name, valueKey, bypassKey, flatKey );
  let propCache = self.propCache = self.propCache || [];
  let ret;

  if( !(ret = propCache[ argHash ]) ){
    ret = propCache[ argHash ] = self.parseImplWarn( name, value, propIsBypass, propIsFlat );
  }

  // - bypasses can't be shared b/c the value can be changed by animations or otherwise overridden
  // - mappings can't be shared b/c mappings are per-element
  if( propIsBypass || propIsFlat === 'mapping' ){
    // need a copy since props are mutated later in their lifecycles
    ret = util.copy( ret );

    if( ret ){
      ret.value = util.copy( ret.value ); // because it could be an array, e.g. colour
    }
  }

  return ret;
};

styfn.parseImplWarn = function( name, value, propIsBypass, propIsFlat ){
  let prop = this.parseImpl( name, value, propIsBypass, propIsFlat );

  if( !prop && value != null ){
    util.warn(`The style property \`${name}: ${value}\` is invalid`);
  }

  if( prop && (prop.name === 'width' || prop.name === 'height') && value === 'label' ){
    util.warn('The style value of `label` is deprecated for `' + prop.name + '`');
  }

  return prop;
};

// parse a property; return null on invalid; return parsed property otherwise
// fields :
// - name : the name of the property
// - value : the parsed, native-typed value of the property
// - strValue : a string value that represents the property value in valid css
// - bypass : true iff the property is a bypass property
styfn.parseImpl = function( name, value, propIsBypass, propIsFlat ){
  let self = this;

  name = util.camel2dash( name ); // make sure the property name is in dash form (e.g. 'property-name' not 'propertyName')

  let property = self.properties[ name ];
  let passedValue = value;
  let types = self.types;

  if( !property ){ return null; } // return null on property of unknown name
  if( value === undefined ){ return null; } // can't assign undefined

  // the property may be an alias
  if( property.alias ){
    property = property.pointsTo;
    name = property.name;
  }

  let valueIsString = is.string( value );
  if( valueIsString ){ // trim the value to make parsing easier
    value = value.trim();
  }

  let type = property.type;
  if( !type ){ return null; } // no type, no luck

  // check if bypass is null or empty string (i.e. indication to delete bypass property)
  if( propIsBypass && (value === '' || value === null) ){
    return {
      name: name,
      value: value,
      bypass: true,
      deleteBypass: true
    };
  }

  // check if value is a function used as a mapper
  if( is.fn( value ) ){
    return {
      name: name,
      value: value,
      strValue: 'fn',
      mapped: types.fn,
      bypass: propIsBypass
    };
  }

  // check if value is mapped
  let data, mapData;
  if( !valueIsString || propIsFlat || value.length < 7 || value[1] !== 'a' ){
    // then don't bother to do the expensive regex checks

  } else if(value.length >= 7 && value[0] === 'd' && ( data = new RegExp( types.data.regex ).exec( value ) )){
    if( propIsBypass ){ return false; } // mappers not allowed in bypass

    let mapped = types.data;

    return {
      name: name,
      value: data,
      strValue: '' + value,
      mapped: mapped,
      field: data[1],
      bypass: propIsBypass
    };

  } else if(value.length >= 10 && value[0] === 'm' && ( mapData = new RegExp( types.mapData.regex ).exec( value ) )){
    if( propIsBypass ){ return false; } // mappers not allowed in bypass
    if( type.multiple ){ return false; } // impossible to map to num

    let mapped = types.mapData;

    // we can map only if the type is a colour or a number
    if( !(type.color || type.number) ){ return false; }

    let valueMin = this.parse( name, mapData[4] ); // parse to validate
    if( !valueMin || valueMin.mapped ){ return false; } // can't be invalid or mapped

    let valueMax = this.parse( name, mapData[5] ); // parse to validate
    if( !valueMax || valueMax.mapped ){ return false; } // can't be invalid or mapped

    // check if valueMin and valueMax are the same
    if( valueMin.pfValue === valueMax.pfValue || valueMin.strValue === valueMax.strValue ){
      util.warn('`' + name + ': ' + value + '` is not a valid mapper because the output range is zero; converting to `' + name + ': ' + valueMin.strValue + '`');

      return this.parse(name, valueMin.strValue); // can't make much of a mapper without a range

    } else if( type.color ){
      let c1 = valueMin.value;
      let c2 = valueMax.value;

      let same = c1[0] === c2[0] // red
        && c1[1] === c2[1] // green
        && c1[2] === c2[2] // blue
        && ( // optional alpha
          c1[3] === c2[3] // same alpha outright
          || (
            (c1[3] == null || c1[3] === 1) // full opacity for colour 1?
            &&
            (c2[3] == null || c2[3] === 1) // full opacity for colour 2?
          )
        )
      ;

      if( same ){ return false; } // can't make a mapper without a range
    }

    return {
      name: name,
      value: mapData,
      strValue: '' + value,
      mapped: mapped,
      field: mapData[1],
      fieldMin: parseFloat( mapData[2] ), // min & max are numeric
      fieldMax: parseFloat( mapData[3] ),
      valueMin: valueMin.value,
      valueMax: valueMax.value,
      bypass: propIsBypass
    };
  }

  if( type.multiple && propIsFlat !== 'multiple' ){
    let vals;

    if( valueIsString ){
      vals = value.split( /\s+/ );
    } else if( is.array( value ) ){
      vals = value;
    } else {
      vals = [ value ];
    }

    if( type.evenMultiple && vals.length % 2 !== 0 ){ return null; }

    let valArr = [];
    let unitsArr = [];
    let pfValArr = [];
    let strVal = '';
    let hasEnum = false;

    for( let i = 0; i < vals.length; i++ ){
      let p = self.parse( name, vals[i], propIsBypass, 'multiple' );

      hasEnum = hasEnum || is.string( p.value );

      valArr.push( p.value );
      pfValArr.push( p.pfValue != null ? p.pfValue : p.value );
      unitsArr.push( p.units );
      strVal += (i > 0 ? ' ' : '') + p.strValue;
    }

    if( type.validate && !type.validate( valArr, unitsArr ) ){
      return null;
    }

    if( type.singleEnum && hasEnum ){
      if( valArr.length === 1 && is.string( valArr[0] ) ){
        return {
          name: name,
          value: valArr[0],
          strValue: valArr[0],
          bypass: propIsBypass
        };
      } else {
        return null;
      }
    }

    return {
      name: name,
      value: valArr,
      pfValue: pfValArr,
      strValue: strVal,
      bypass: propIsBypass,
      units: unitsArr
    };
  }

  // several types also allow enums
  let checkEnums = function(){
    for( let i = 0; i < type.enums.length; i++ ){
      let en = type.enums[ i ];

      if( en === value ){
        return {
          name: name,
          value: value,
          strValue: '' + value,
          bypass: propIsBypass
        };
      }
    }

    return null;
  };

  // check the type and return the appropriate object
  if( type.number ){
    let units;
    let implicitUnits = 'px'; // not set => px

    if( type.units ){ // use specified units if set
      units = type.units;
    }

    if( type.implicitUnits ){
      implicitUnits = type.implicitUnits;
    }

    if( !type.unitless ){
      if( valueIsString ){
        let unitsRegex = 'px|em' + (type.allowPercent ? '|\\%' : '');
        if( units ){ unitsRegex = units; } // only allow explicit units if so set
        let match = value.match( '^(' + util.regex.number + ')(' + unitsRegex + ')?' + '$' );

        if( match ){
          value = match[1];
          units = match[2] || implicitUnits;
        }

      } else if( !units || type.implicitUnits ){
        units = implicitUnits; // implicitly px if unspecified
      }
    }

    value = parseFloat( value );

    // if not a number and enums not allowed, then the value is invalid
    if( isNaN( value ) && type.enums === undefined ){
      return null;
    }

    // check if this number type also accepts special keywords in place of numbers
    // (i.e. `left`, `auto`, etc)
    if( isNaN( value ) && type.enums !== undefined ){
      value = passedValue;

      return checkEnums();
    }

    // check if value must be an integer
    if( type.integer && !is.integer( value ) ){
      return null;
    }

    // check value is within range
    if( ( type.min !== undefined && ( value < type.min || (type.strictMin && value === type.min) ) )
    ||  ( type.max !== undefined && ( value > type.max || (type.strictMax && value === type.max) ) )
    ){
      return null;
    }

    let ret = {
      name: name,
      value: value,
      strValue: '' + value + (units ? units : ''),
      units: units,
      bypass: propIsBypass
    };

    // normalise value in pixels
    if( type.unitless || (units !== 'px' && units !== 'em') ){
      ret.pfValue = value;
    } else {
      ret.pfValue = ( units === 'px' || !units ? (value) : (this.getEmSizeInPixels() * value) );
    }

    // normalise value in ms
    if( units === 'ms' || units === 's' ){
      ret.pfValue = units === 'ms' ? value : 1000 * value;
    }

    // normalise value in rad
    if( units === 'deg' || units === 'rad' ){
      ret.pfValue = units === 'rad' ? value : math.deg2rad( value );
    }

    // normalize value in %
    if( units === '%' ){
      ret.pfValue = value / 100;
    }

    return ret;

  } else if( type.propList ){

    let props = [];
    let propsStr = '' + value;

    if( propsStr === 'none' ){
      // leave empty

    } else { // go over each prop

      let propsSplit = propsStr.split( /\s*,\s*|\s+/ );
      for( let i = 0; i < propsSplit.length; i++ ){
        let propName = propsSplit[ i ].trim();

        if( self.properties[ propName ] ){
          props.push( propName );
        } else {
          util.warn('`' + propName + '` is not a valid property name');
        }
      }

      if( props.length === 0 ){ return null; }
    }

    return {
      name: name,
      value: props,
      strValue: props.length === 0 ? 'none' : props.join(' '),
      bypass: propIsBypass
    };

  } else if( type.color ){
    let tuple = util.color2tuple( value );

    if( !tuple ){ return null; }

    return {
      name: name,
      value: tuple,
      pfValue: tuple,
      strValue: 'rgb(' + tuple[0] + ',' + tuple[1] + ',' + tuple[2] + ')', // n.b. no spaces b/c of multiple support
      bypass: propIsBypass
    };

  } else if( type.regex || type.regexes ){

    // first check enums
    if( type.enums ){
      let enumProp = checkEnums();

      if( enumProp ){ return enumProp; }
    }

    let regexes = type.regexes ? type.regexes : [ type.regex ];

    for( let i = 0; i < regexes.length; i++ ){
      let regex = new RegExp( regexes[ i ] ); // make a regex from the type string
      let m = regex.exec( value );

      if( m ){ // regex matches
        return {
          name: name,
          value: type.singleRegexMatchValue ? m[1] : m,
          strValue: '' + value,
          bypass: propIsBypass
        };

      }
    }

    return null; // didn't match any

  } else if( type.string ){
    // just return
    return {
      name: name,
      value: '' + value,
      strValue: '' + value,
      bypass: propIsBypass
    };

  } else if( type.enums ){ // check enums last because it's a combo type in others
    return checkEnums();

  } else {
    return null; // not a type we can handle
  }

};

export default styfn;
