import * as util from '../util/index.mjs';
import Selector from '../selector/index.mjs';

let styfn = {};

styfn.appendFromString = function( string ){
  let self = this;
  let style = this;
  let remaining = '' + string;
  let selAndBlockStr;
  let blockRem;
  let propAndValStr;

  // remove comments from the style string
  remaining = remaining.replace( /[/][*](\s|.)+?[*][/]/g, '' );

  function removeSelAndBlockFromRemaining(){
    // remove the parsed selector and block from the remaining text to parse
    if( remaining.length > selAndBlockStr.length ){
      remaining = remaining.substr( selAndBlockStr.length );
    } else {
      remaining = '';
    }
  }

  function removePropAndValFromRem(){
    // remove the parsed property and value from the remaining block text to parse
    if( blockRem.length > propAndValStr.length ){
      blockRem = blockRem.substr( propAndValStr.length );
    } else {
      blockRem = '';
    }
  }

  for(;;){
    let nothingLeftToParse = remaining.match( /^\s*$/ );
    if( nothingLeftToParse ){ break; }

    let selAndBlock = remaining.match( /^\s*((?:.|\s)+?)\s*\{((?:.|\s)+?)\}/ );

    if( !selAndBlock ){
      util.warn( 'Halting stylesheet parsing: String stylesheet contains more to parse but no selector and block found in: ' + remaining );
      break;
    }

    selAndBlockStr = selAndBlock[0];

    // parse the selector
    let selectorStr = selAndBlock[1];
    if( selectorStr !== 'core' ){
      let selector = new Selector( selectorStr );
      if( selector.invalid ){
        util.warn( 'Skipping parsing of block: Invalid selector found in string stylesheet: ' + selectorStr );

        // skip this selector and block
        removeSelAndBlockFromRemaining();
        continue;
      }
    }

    // parse the block of properties and values
    let blockStr = selAndBlock[2];
    let invalidBlock = false;
    blockRem = blockStr;
    let props = [];

    for(;;){
      let nothingLeftToParse = blockRem.match( /^\s*$/ );
      if( nothingLeftToParse ){ break; }

      let propAndVal = blockRem.match( /^\s*(.+?)\s*:\s*(.+?)(?:\s*;|\s*$)/ );

      if( !propAndVal ){
        util.warn( 'Skipping parsing of block: Invalid formatting of style property and value definitions found in:' + blockStr );
        invalidBlock = true;
        break;
      }

      propAndValStr = propAndVal[0];
      let propStr = propAndVal[1];
      let valStr = propAndVal[2];

      let prop = self.properties[ propStr ];
      if( !prop ){
        util.warn( 'Skipping property: Invalid property name in: ' + propAndValStr );

        // skip this property in the block
        removePropAndValFromRem();
        continue;
      }

      let parsedProp = style.parse( propStr, valStr );

      if( !parsedProp ){
        util.warn( 'Skipping property: Invalid property definition in: ' + propAndValStr );

        // skip this property in the block
        removePropAndValFromRem();
        continue;
      }

      props.push( {
        name: propStr,
        val: valStr
      } );
      removePropAndValFromRem();
    }

    if( invalidBlock ){
      removeSelAndBlockFromRemaining();
      break;
    }

    // put the parsed block in the style
    style.selector( selectorStr );
    for( let i = 0; i < props.length; i++ ){
      let prop = props[ i ];
      style.css( prop.name, prop.val );
    }

    removeSelAndBlockFromRemaining();
  }

  return style;
};

styfn.fromString = function( string ){
  let style = this;

  style.resetToDefault();
  style.appendFromString( string );

  return style;
};

export default styfn;
