import Emitter from '../emitter.mjs';
import define from '../define/index.mjs';
import * as is from '../is.mjs';
import Selector from '../selector/index.mjs';

let emitterOptions = {
  qualifierCompare: function( selector1, selector2 ){
    if( selector1 == null || selector2 == null ){
      return selector1 == null && selector2 == null;
    } else {
      return selector1.sameText( selector2 );
    }
  },
  eventMatches: function( cy, listener, eventObj ){
    let selector = listener.qualifier;

    if( selector != null ){
      return cy !== eventObj.target && is.element( eventObj.target ) && selector.matches( eventObj.target );
    }

    return true;
  },
  addEventFields: function( cy, evt ){
    evt.cy = cy;
    evt.target = cy;
  },
  callbackContext: function( cy, listener, eventObj ){
    return listener.qualifier != null ? eventObj.target : cy;
  }
};

let argSelector = function( arg ){
  if( is.string(arg) ){
    return new Selector( arg );
  } else {
    return arg;
  }
};

let elesfn = ({
  createEmitter: function(){
    let _p = this._private;

    if( !_p.emitter ){
      _p.emitter = new Emitter( emitterOptions, this );
    }

    return this;
  },

  emitter: function(){
    return this._private.emitter;
  },

  on: function( events, selector, callback ){
    this.emitter().on( events, argSelector(selector), callback );

    return this;
  },

  removeListener: function( events, selector, callback ){
    this.emitter().removeListener( events, argSelector(selector), callback );

    return this;
  },

  removeAllListeners: function(){
    this.emitter().removeAllListeners();

    return this;
  },

  one: function( events, selector, callback ){
    this.emitter().one( events, argSelector(selector), callback );

    return this;
  },

  once: function( events, selector, callback ){
    this.emitter().one( events, argSelector(selector), callback );

    return this;
  },

  emit: function( events, extraParams ){
    this.emitter().emit( events, extraParams );

    return this;
  },

  emitAndNotify: function( event, eles ){
    this.emit( event );

    this.notify( event, eles );

    return this;
  }
});

define.eventAliasesOn( elesfn );

export default elesfn;
