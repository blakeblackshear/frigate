import * as is from '../is.mjs';
import Style from '../style/index.mjs';

let corefn = ({

  style: function( newStyle ){
    if( newStyle ){
      let s = this.setStyle( newStyle );

      s.update();
    }

    return this._private.style;
  },

  setStyle: function( style ){
    let _p = this._private;

    if( is.stylesheet( style ) ){
      _p.style = style.generateStyle( this );

    } else if( is.array( style ) ){
      _p.style = Style.fromJson( this, style );

    } else if( is.string( style ) ){
      _p.style = Style.fromString( this, style );

    } else {
      _p.style = Style( this );
    }

    return _p.style;
  },

  // e.g. cy.data() changed => recalc ele mappers
  updateStyle: function(){
    this.mutableElements().updateStyle(); // just send to all eles
  }
});

export default corefn;
