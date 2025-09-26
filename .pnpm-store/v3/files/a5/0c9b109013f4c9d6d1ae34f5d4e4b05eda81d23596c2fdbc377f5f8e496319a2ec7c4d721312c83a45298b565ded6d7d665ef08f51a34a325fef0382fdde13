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
  eventMatches: function( ele, listener, eventObj ){
    let selector = listener.qualifier;

    if( selector != null ){
      return ele !== eventObj.target && is.element( eventObj.target ) && selector.matches( eventObj.target );
    }

    return true;
  },
  addEventFields: function( ele, evt ){
    evt.cy = ele.cy();
    evt.target = ele;
  },
  callbackContext: function( ele, listener, eventObj ){
    return listener.qualifier != null ? eventObj.target : ele;
  },
  beforeEmit: function( context, listener/*, eventObj*/ ){
    if( listener.conf && listener.conf.once ){
      listener.conf.onceCollection.removeListener( listener.event, listener.qualifier, listener.callback );
    }
  },
  bubble: function(){
    return true;
  },
  parent: function( ele ){
    return ele.isChild() ? ele.parent() : ele.cy();
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
    for( let i = 0; i < this.length; i++ ){
      let ele = this[i];
      let _p = ele._private;

      if( !_p.emitter ){
        _p.emitter = new Emitter( emitterOptions, ele );
      }
    }

    return this;
  },

  emitter: function(){
    return this._private.emitter;
  },

  on: function( events, selector, callback ){
    let argSel = argSelector(selector);

    for( let i = 0; i < this.length; i++ ){
      let ele = this[i];

      ele.emitter().on( events, argSel, callback );
    }

    return this;
  },

  removeListener: function( events, selector, callback ){
    let argSel = argSelector(selector);

    for( let i = 0; i < this.length; i++ ){
      let ele = this[i];

      ele.emitter().removeListener( events, argSel, callback );
    }

    return this;
  },

  removeAllListeners: function(){
    for( let i = 0; i < this.length; i++ ){
      let ele = this[i];

      ele.emitter().removeAllListeners();
    }

    return this;
  },

  one: function( events, selector, callback ){
    let argSel = argSelector(selector);

    for( let i = 0; i < this.length; i++ ){
      let ele = this[i];

      ele.emitter().one( events, argSel, callback );
    }

    return this;
  },

  once: function( events, selector, callback ){
    let argSel = argSelector(selector);

    for( let i = 0; i < this.length; i++ ){
      let ele = this[i];

      ele.emitter().on( events, argSel, callback, {
        once: true,
        onceCollection: this
      } );
    }
  },

  emit: function( events, extraParams ){
    for( let i = 0; i < this.length; i++ ){
      let ele = this[i];

      ele.emitter().emit( events, extraParams );
    }

    return this;
  },

  emitAndNotify: function( event, extraParams ){ // for internal use only
    if( this.length === 0 ){ return; } // empty collections don't need to notify anything

    // notify renderer
    this.cy().notify( event, this );

    this.emit( event, extraParams );

    return this;
  }
});

define.eventAliasesOn( elesfn );

export default elesfn;
