import * as util from'./util/index.mjs';
import define from './define/index.mjs';
import Collection from './collection/index.mjs';
import Core from './core/index.mjs';
import incExts from './extensions/index.mjs';
import * as is from './is.mjs';
import Emitter from './emitter.mjs';

// registered extensions to cytoscape, indexed by name
let extensions = {};

// registered modules for extensions, indexed by name
let modules = {};

function setExtension( type, name, registrant ){

  let ext = registrant;

  let overrideErr = function( field ){
    util.warn( 'Can not register `' + name + '` for `' + type + '` since `' + field + '` already exists in the prototype and can not be overridden' );
  };

  if( type === 'core' ){
    if( Core.prototype[ name ] ){
      return overrideErr( name );
    } else {
      Core.prototype[ name ] = registrant;
    }

  } else if( type === 'collection' ){
    if( Collection.prototype[ name ] ){
      return overrideErr( name );
    } else {
      Collection.prototype[ name ] = registrant;
    }

  } else if( type === 'layout' ){
    // fill in missing layout functions in the prototype

    let Layout = function( options ){
      this.options = options;

      registrant.call( this, options );

      // make sure layout has _private for use w/ std apis like .on()
      if( !is.plainObject( this._private ) ){
        this._private = {};
      }

      this._private.cy = options.cy;
      this._private.listeners = [];

      this.createEmitter();
    };

    let layoutProto = Layout.prototype = Object.create( registrant.prototype );

    let optLayoutFns = [];

    for( let i = 0; i < optLayoutFns.length; i++ ){
      let fnName = optLayoutFns[ i ];

      layoutProto[ fnName ] = layoutProto[ fnName ] || function(){ return this; };
    }

    // either .start() or .run() is defined, so autogen the other
    if( layoutProto.start && !layoutProto.run ){
      layoutProto.run = function(){ this.start(); return this; };
    } else if( !layoutProto.start && layoutProto.run ){
      layoutProto.start = function(){ this.run(); return this; };
    }

    let regStop = registrant.prototype.stop;
    layoutProto.stop = function(){
      let opts = this.options;

      if( opts && opts.animate ){
        let anis = this.animations;

        if( anis ){
          for( let i = 0; i < anis.length; i++ ){
            anis[ i ].stop();
          }
        }
      }

      if( regStop ){
        regStop.call( this );
      } else {
        this.emit( 'layoutstop' );
      }

      return this;
    };

    if( !layoutProto.destroy ){
      layoutProto.destroy = function(){
        return this;
      };
    }

    layoutProto.cy = function(){
      return this._private.cy;
    };

    let getCy = layout => layout._private.cy;

    let emitterOpts = {
      addEventFields: function( layout, evt ){
        evt.layout = layout;
        evt.cy = getCy(layout);
        evt.target = layout;
      },
      bubble: function(){ return true; },
      parent: function( layout ){ return getCy(layout); }
    };

    util.assign( layoutProto, {
      createEmitter: function(){
        this._private.emitter = new Emitter( emitterOpts, this );

        return this;
      },
      emitter: function(){ return this._private.emitter; },
      on: function( evt, cb ){ this.emitter().on( evt, cb ); return this; },
      one: function( evt, cb ){ this.emitter().one( evt, cb ); return this; },
      once: function( evt, cb ){ this.emitter().one( evt, cb ); return this; },
      removeListener: function( evt, cb ){ this.emitter().removeListener( evt, cb ); return this; },
      removeAllListeners: function(){ this.emitter().removeAllListeners(); return this; },
      emit: function( evt, params ){ this.emitter().emit( evt, params ); return this; }
    } );

    define.eventAliasesOn( layoutProto );

    ext = Layout; // replace with our wrapped layout

  } else if( type === 'renderer' && name !== 'null' && name !== 'base' ){
    // user registered renderers inherit from base

    let BaseRenderer = getExtension( 'renderer', 'base' );
    let bProto = BaseRenderer.prototype;
    let RegistrantRenderer = registrant;
    let rProto = registrant.prototype;

    let Renderer = function(){
      BaseRenderer.apply( this, arguments );
      RegistrantRenderer.apply( this, arguments );
    };

    let proto = Renderer.prototype;

    for( let pName in bProto ){
      let pVal = bProto[ pName ];
      let existsInR = rProto[ pName ] != null;

      if( existsInR ){
        return overrideErr( pName );
      }

      proto[ pName ] = pVal; // take impl from base
    }

    for( let pName in rProto ){
      proto[ pName ] = rProto[ pName ]; // take impl from registrant
    }

    bProto.clientFunctions.forEach( function( name ){
      proto[ name ] = proto[ name ] || function(){
        util.error( 'Renderer does not implement `renderer.' + name + '()` on its prototype' );
      };
    } );

    ext = Renderer;

  } else if (type === '__proto__' || type === 'constructor' || type === 'prototype'){
    // to avoid potential prototype pollution
    return util.error( type + ' is an illegal type to be registered, possibly lead to prototype pollutions' );
  }

  return util.setMap( {
    map: extensions,
    keys: [ type, name ],
    value: ext
  } );
}

function getExtension( type, name ){
  return util.getMap( {
    map: extensions,
    keys: [ type, name ]
  } );
}

function setModule( type, name, moduleType, moduleName, registrant ){
  return util.setMap( {
    map: modules,
    keys: [ type, name, moduleType, moduleName ],
    value: registrant
  } );
}

function getModule( type, name, moduleType, moduleName ){
  return util.getMap( {
    map: modules,
    keys: [ type, name, moduleType, moduleName ]
  } );
}

let extension = function(){
  // e.g. extension('renderer', 'svg')
  if( arguments.length === 2 ){
    return getExtension.apply( null, arguments );
  }

  // e.g. extension('renderer', 'svg', { ... })
  else if( arguments.length === 3 ){
    return setExtension.apply( null, arguments );
  }

  // e.g. extension('renderer', 'svg', 'nodeShape', 'ellipse')
  else if( arguments.length === 4 ){
    return getModule.apply( null, arguments );
  }

  // e.g. extension('renderer', 'svg', 'nodeShape', 'ellipse', { ... })
  else if( arguments.length === 5 ){
    return setModule.apply( null, arguments );
  }

  else {
    util.error( 'Invalid extension access syntax' );
  }

};

// allows a core instance to access extensions internally
Core.prototype.extension = extension;

// included extensions
incExts.forEach( function( group ){
  group.extensions.forEach( function( ext ){
    setExtension( group.type, ext.name, ext.impl );
  } );
} );

export default extension;
