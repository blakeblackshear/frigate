let styfn = {};

styfn.appendFromJson = function( json ){
  let style = this;

  for( let i = 0; i < json.length; i++ ){
    let context = json[ i ];
    let selector = context.selector;
    let props = context.style || context.css;
    let names = Object.keys( props );

    style.selector( selector ); // apply selector

    for( let j = 0; j < names.length; j++ ){
      let name = names[j];
      let value = props[ name ];

      style.css( name, value ); // apply property
    }
  }

  return style;
};

// accessible cy.style() function
styfn.fromJson = function( json ){
  let style = this;

  style.resetToDefault();
  style.appendFromJson( json );

  return style;
};

// get json from cy.style() api
styfn.json = function(){
  let json = [];

  for( let i = this.defaultLength; i < this.length; i++ ){
    let cxt = this[ i ];
    let selector = cxt.selector;
    let props = cxt.properties;
    let css = {};

    for( let j = 0; j < props.length; j++ ){
      let prop = props[ j ];
      css[ prop.name ] = prop.strValue;
    }

    json.push( {
      selector: !selector ? 'core' : selector.toString(),
      style: css
    } );
  }

  return json;
};

export default styfn;
