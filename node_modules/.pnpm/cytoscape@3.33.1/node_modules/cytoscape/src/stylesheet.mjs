import * as is from './is.mjs';
import Style from './style/index.mjs';
import { dash2camel } from './util/index.mjs';

// a dummy stylesheet object that doesn't need a reference to the core
// (useful for init)
let Stylesheet = function(){
  if( !(this instanceof Stylesheet) ){
    return new Stylesheet();
  }

  this.length = 0;
};

let sheetfn = Stylesheet.prototype;

sheetfn.instanceString = function(){
  return 'stylesheet';
};

// just store the selector to be parsed later
sheetfn.selector = function( selector ){
  let i = this.length++;

  this[ i ] = {
    selector: selector,
    properties: []
  };

  return this; // chaining
};

// just store the property to be parsed later
sheetfn.css = function( name, value ){
  let i = this.length - 1;

  if( is.string( name ) ){
    this[ i ].properties.push( {
      name: name,
      value: value
    } );
  } else if( is.plainObject( name ) ){
    let map = name;
    let propNames = Object.keys( map );

    for( let j = 0; j < propNames.length; j++ ){
      let key = propNames[ j ];
      let mapVal = map[ key ];

      if( mapVal == null ){ continue; }

      let prop = Style.properties[key] || Style.properties[dash2camel(key)];

      if( prop == null ){ continue; }

      let name = prop.name;
      let value = mapVal;

      this[ i ].properties.push( {
        name: name,
        value: value
      } );
    }
  }

  return this; // chaining
};

sheetfn.style = sheetfn.css;

// generate a real style object from the dummy stylesheet
sheetfn.generateStyle = function( cy ){
  let style = new Style( cy );

  return this.appendToStyle( style );
};

// append a dummy stylesheet object on a real style object
sheetfn.appendToStyle = function( style ){
  for( let i = 0; i < this.length; i++ ){
    let context = this[ i ];
    let selector = context.selector;
    let props = context.properties;

    style.selector( selector ); // apply selector

    for( let j = 0; j < props.length; j++ ){
      let prop = props[ j ];

      style.css( prop.name, prop.value ); // apply property
    }
  }

  return style;
};

export default Stylesheet;
