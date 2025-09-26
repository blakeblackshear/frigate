import * as is from '../is.mjs';
import * as util from '../util/index.mjs';

let styfn = {};

// bypasses are applied to an existing style on an element, and just tacked on temporarily
// returns true iff application was successful for at least 1 specified property
styfn.applyBypass = function( eles, name, value, updateTransitions ){
  let self = this;
  let props = [];
  let isBypass = true;

  // put all the properties (can specify one or many) in an array after parsing them
  if( name === '*' || name === '**' ){ // apply to all property names

    if( value !== undefined ){
      for( let i = 0; i < self.properties.length; i++ ){
        let prop = self.properties[ i ];
        let name = prop.name;

        let parsedProp = this.parse( name, value, true );

        if( parsedProp ){
          props.push( parsedProp );
        }
      }
    }

  } else if( is.string( name ) ){ // then parse the single property
    let parsedProp = this.parse( name, value, true );

    if( parsedProp ){
      props.push( parsedProp );
    }
  } else if( is.plainObject( name ) ){ // then parse each property
    let specifiedProps = name;
    updateTransitions = value;

    let names = Object.keys( specifiedProps );

    for( let i = 0; i < names.length; i++ ){
      let name = names[i];
      let value = specifiedProps[ name ];

      if( value === undefined ){ // try camel case name too
        value = specifiedProps[ util.dash2camel( name ) ];
      }

      if( value !== undefined ){
        let parsedProp = this.parse( name, value, true );

        if( parsedProp ){
          props.push( parsedProp );
        }
      }
    }
  } else { // can't do anything without well defined properties
    return false;
  }

  // we've failed if there are no valid properties
  if( props.length === 0 ){ return false; }

  // now, apply the bypass properties on the elements
  let ret = false; // return true if at least one succesful bypass applied
  for( let i = 0; i < eles.length; i++ ){ // for each ele
    let ele = eles[ i ];
    let diffProps = {};
    let diffProp;

    for( let j = 0; j < props.length; j++ ){ // for each prop
      let prop = props[ j ];

      if( updateTransitions ){
        let prevProp = ele.pstyle( prop.name );
        diffProp = diffProps[ prop.name ] = { prev: prevProp };
      }

      ret = this.applyParsedProperty( ele, util.copy(prop) ) || ret;

      if( updateTransitions ){
        diffProp.next = ele.pstyle( prop.name );
      }

    } // for props

    if( ret ){
      this.updateStyleHints( ele );
    }

    if( updateTransitions ){
      this.updateTransitions( ele, diffProps, isBypass );
    }
  } // for eles

  return ret;
};

// only useful in specific cases like animation
styfn.overrideBypass = function( eles, name, value ){
  name = util.camel2dash( name );

  for( let i = 0; i < eles.length; i++ ){
    let ele = eles[ i ];
    let prop = ele._private.style[ name ];
    let type = this.properties[ name ].type;
    let isColor = type.color;
    let isMulti = type.mutiple;
    let oldValue = !prop ? null : prop.pfValue != null ? prop.pfValue : prop.value;

    if( !prop || !prop.bypass ){ // need a bypass if one doesn't exist
      this.applyBypass( ele, name, value );
    } else {
      prop.value = value;

      if( prop.pfValue != null ){
        prop.pfValue = value;
      }

      if( isColor ){
        prop.strValue = 'rgb(' + value.join( ',' ) + ')';
      } else if( isMulti ){
        prop.strValue = value.join( ' ' );
      } else {
        prop.strValue = '' + value;
      }

      this.updateStyleHints( ele );
    }

    this.checkTriggers( ele, name, oldValue, value );
  }
};

styfn.removeAllBypasses = function( eles, updateTransitions ){
  return this.removeBypasses( eles, this.propertyNames, updateTransitions );
};

styfn.removeBypasses = function( eles, props, updateTransitions ){
  let isBypass = true;

  for( let j = 0; j < eles.length; j++ ){
    let ele = eles[ j ];
    let diffProps = {};

    for( let i = 0; i < props.length; i++ ){
      let name = props[ i ];
      let prop = this.properties[ name ];
      let prevProp = ele.pstyle( prop.name );

      if( !prevProp || !prevProp.bypass ){
        // if a bypass doesn't exist for the prop, nothing needs to be removed
        continue;
      }

      let value = ''; // empty => remove bypass
      let parsedProp = this.parse( name, value, true );
      let diffProp = diffProps[ prop.name ] = { prev: prevProp };

      this.applyParsedProperty( ele, parsedProp );

      diffProp.next = ele.pstyle( prop.name );
    } // for props

    this.updateStyleHints( ele );

    if( updateTransitions ){
      this.updateTransitions( ele, diffProps, isBypass );
    }
  } // for eles
};

export default styfn;
