import window from '../window.mjs';
import * as util from '../util/index.mjs';
import Collection from '../collection/index.mjs';
import * as is from '../is.mjs';
import Promise from '../promise.mjs';

import addRemove from './add-remove.mjs';
import animation from './animation/index.mjs';
import events from './events.mjs';
import exportFormat from './export.mjs';
import layout from './layout.mjs';
import notification from './notification.mjs';
import renderer from './renderer.mjs';
import search from './search.mjs';
import style from './style.mjs';
import viewport from './viewport.mjs';
import data from './data.mjs';

let Core = function( opts ){
  let cy = this;

  opts = util.extend( {}, opts );

  let container = opts.container;

  // allow for passing a wrapped jquery object
  // e.g. cytoscape({ container: $('#cy') })
  if( container && !is.htmlElement( container ) && is.htmlElement( container[0] ) ){
    container = container[0];
  }

  let reg = container ? container._cyreg : null; // e.g. already registered some info (e.g. readies) via jquery
  reg = reg || {};

  if( reg && reg.cy ){
    reg.cy.destroy();

    reg = {}; // old instance => replace reg completely
  }

  let readies = reg.readies = reg.readies || [];

  if( container ){ container._cyreg = reg; } // make sure container assoc'd reg points to this cy
  reg.cy = cy;

  let head = window !== undefined && container !== undefined && !opts.headless;
  let options = opts;
  options.layout = util.extend( { name: head ? 'grid' : 'null' }, options.layout );
  options.renderer = util.extend( { name: head ? 'canvas' : 'null' }, options.renderer );

  let defVal = function( def, val, altVal ){
    if( val !== undefined ){
      return val;
    } else if( altVal !== undefined ){
      return altVal;
    } else {
      return def;
    }
  };

  let _p = this._private = {
    container: container, // html dom ele container
    ready: false, // whether ready has been triggered
    options: options, // cached options
    elements: new Collection( this ), // elements in the graph
    listeners: [], // list of listeners
    aniEles: new Collection( this ), // elements being animated
    data: options.data || {}, // data for the core
    scratch: {}, // scratch object for core
    layout: null,
    renderer: null,
    destroyed: false, // whether destroy was called
    notificationsEnabled: true, // whether notifications are sent to the renderer
    minZoom: 1e-50,
    maxZoom: 1e50,
    zoomingEnabled: defVal( true, options.zoomingEnabled ),
    userZoomingEnabled: defVal( true, options.userZoomingEnabled ),
    panningEnabled: defVal( true, options.panningEnabled ),
    userPanningEnabled: defVal( true, options.userPanningEnabled ),
    boxSelectionEnabled: defVal( true, options.boxSelectionEnabled ),
    autolock: defVal( false, options.autolock, options.autolockNodes ),
    autoungrabify: defVal( false, options.autoungrabify, options.autoungrabifyNodes ),
    autounselectify: defVal( false, options.autounselectify ),
    styleEnabled: options.styleEnabled === undefined ? head : options.styleEnabled,
    zoom: is.number( options.zoom ) ? options.zoom : 1,
    pan: {
      x: is.plainObject( options.pan ) && is.number( options.pan.x ) ? options.pan.x : 0,
      y: is.plainObject( options.pan ) && is.number( options.pan.y ) ? options.pan.y : 0
    },
    animation: { // object for currently-running animations
      current: [],
      queue: []
    },
    hasCompoundNodes: false,
    multiClickDebounceTime: defVal(250, options.multiClickDebounceTime)
  };

  this.createEmitter();

  // set selection type
  this.selectionType( options.selectionType );

  // init zoom bounds
  this.zoomRange({ min: options.minZoom, max: options.maxZoom });

  let loadExtData = function( extData, next ){
    let anyIsPromise = extData.some( is.promise );

    if( anyIsPromise ){
      return Promise.all( extData ).then( next ); // load all data asynchronously, then exec rest of init
    } else {
      next( extData ); // exec synchronously for convenience
    }
  };

  // start with the default stylesheet so we have something before loading an external stylesheet
  if( _p.styleEnabled ){
    cy.setStyle([]);
  }

  // create the renderer
  let rendererOptions = util.assign({}, options, options.renderer); // allow rendering hints in top level options
  cy.initRenderer( rendererOptions );

  let setElesAndLayout = function( elements, onload, ondone ){
    cy.notifications( false );

    // remove old elements
    let oldEles = cy.mutableElements();
    if( oldEles.length > 0 ){
      oldEles.remove();
    }

    if( elements != null ){
      if( is.plainObject( elements ) || is.array( elements ) ){
        cy.add( elements );
      }
    }

    cy.one( 'layoutready', function( e ){
      cy.notifications( true );
      cy.emit( e ); // we missed this event by turning notifications off, so pass it on

      cy.one( 'load', onload );
      cy.emitAndNotify( 'load' );
    } ).one( 'layoutstop', function(){
      cy.one( 'done', ondone );
      cy.emit( 'done' );
    } );

    let layoutOpts = util.extend( {}, cy._private.options.layout );
    layoutOpts.eles = cy.elements();

    cy.layout( layoutOpts ).run();
  };

  loadExtData([ options.style, options.elements ], function( thens ){
    let initStyle = thens[0];
    let initEles = thens[1];

    // init style
    if( _p.styleEnabled ){
      cy.style().append( initStyle );
    }

    // initial load
    setElesAndLayout( initEles, function(){ // onready
      cy.startAnimationLoop();
      _p.ready = true;

      // if a ready callback is specified as an option, the bind it
      if( is.fn( options.ready ) ){
        cy.on( 'ready', options.ready );
      }

      // bind all the ready handlers registered before creating this instance
      for( let i = 0; i < readies.length; i++ ){
        let fn = readies[ i ];
        cy.on( 'ready', fn );
      }
      if( reg ){ reg.readies = []; } // clear b/c we've bound them all and don't want to keep it around in case a new core uses the same div etc

      cy.emit( 'ready' );
    }, options.done );

  } );
};

let corefn = Core.prototype; // short alias

util.extend( corefn, {
  instanceString: function(){
    return 'core';
  },

  isReady: function(){
    return this._private.ready;
  },

  destroyed: function(){
    return this._private.destroyed;
  },

  ready: function( fn ){
    if( this.isReady() ){
      this.emitter().emit( 'ready', [], fn ); // just calls fn as though triggered via ready event
    } else {
      this.on( 'ready', fn );
    }

    return this;
  },

  destroy: function(){
    let cy = this;
    if( cy.destroyed() ) return;

    cy.stopAnimationLoop();

    cy.destroyRenderer();

    this.emit( 'destroy' );

    cy._private.destroyed = true;

    return cy;
  },

  hasElementWithId: function( id ){
    return this._private.elements.hasElementWithId( id );
  },

  getElementById: function( id ){
    return this._private.elements.getElementById( id );
  },

  hasCompoundNodes: function(){
    return this._private.hasCompoundNodes;
  },

  headless: function(){
    return this._private.renderer.isHeadless();
  },

  styleEnabled: function(){
    return this._private.styleEnabled;
  },

  addToPool: function( eles ){
    this._private.elements.merge( eles );

    return this; // chaining
  },

  removeFromPool: function( eles ){
    this._private.elements.unmerge( eles );

    return this;
  },

  container: function(){
    return this._private.container || null;
  },

  window: function() {
    let container = this._private.container;
    if (container == null) return window;

    let ownerDocument = this._private.container.ownerDocument;

    if (ownerDocument === undefined || ownerDocument == null) {
      return window;
    }

    return ownerDocument.defaultView || window;
  },

  mount: function( container ){
    if( container == null ){ return; }

    let cy = this;
    let _p = cy._private;
    let options = _p.options;

    if( !is.htmlElement( container ) && is.htmlElement( container[0] ) ){
      container = container[0];
    }

    cy.stopAnimationLoop();

    cy.destroyRenderer();

    _p.container = container;
    _p.styleEnabled = true;

    cy.invalidateSize();

    cy.initRenderer( util.assign({}, options, options.renderer, {
      // allow custom renderer name to be re-used, otherwise use canvas
      name: options.renderer.name === 'null' ? 'canvas' : options.renderer.name
    }) );

    cy.startAnimationLoop();

    cy.style( options.style );

    cy.emit( 'mount' );

    return cy;
  },

  unmount: function(){
    let cy = this;

    cy.stopAnimationLoop();

    cy.destroyRenderer();

    cy.initRenderer( { name: 'null' } );

    cy.emit( 'unmount' );

    return cy;
  },

  options: function(){
    return util.copy( this._private.options );
  },

  json: function( obj ){
    let cy = this;
    let _p = cy._private;
    let eles = cy.mutableElements();
    let getFreshRef = ele => cy.getElementById(ele.id());

    if( is.plainObject( obj ) ){ // set

      cy.startBatch();

      if( obj.elements ){
        let idInJson = {};

        let updateEles = function( jsons, gr ){
          let toAdd = [];
          let toMod = [];

          for( let i = 0; i < jsons.length; i++ ){
            let json = jsons[ i ];

            if( !json.data.id ){
              util.warn( 'cy.json() cannot handle elements without an ID attribute' );
              continue;
            }

            let id = '' + json.data.id; // id must be string
            let ele = cy.getElementById( id );

            idInJson[ id ] = true;

            if( ele.length !== 0 ){ // existing element should be updated
              toMod.push({ ele, json });
            } else { // otherwise should be added
              if( gr ){
                json.group = gr;

                toAdd.push( json );
              } else {
                toAdd.push( json );
              }
            }
          }

          cy.add( toAdd );

          for( let i = 0; i < toMod.length; i++ ){
            let { ele, json } = toMod[i];

            ele.json(json);
          }
        };

        if( is.array( obj.elements ) ){ // elements: []
          updateEles( obj.elements );

        } else { // elements: { nodes: [], edges: [] }
          let grs = [ 'nodes', 'edges' ];
          for( let i = 0; i < grs.length; i++ ){
            let gr = grs[ i ];
            let elements = obj.elements[ gr ];

            if( is.array( elements ) ){
              updateEles( elements, gr );
            }
          }
        }

        let parentsToRemove = cy.collection();

        (eles
          .filter(ele => !idInJson[ ele.id() ])
          .forEach(ele => {
            if ( ele.isParent() ) {
              parentsToRemove.merge(ele);
            } else {
              ele.remove();
            }
          })
        );

        // so that children are not removed w/parent
        parentsToRemove.forEach(ele => ele.children().move({ parent: null }));

        // intermediate parents may be moved by prior line, so make sure we remove by fresh refs
        parentsToRemove.forEach(ele => getFreshRef(ele).remove());
      }

      if( obj.style ){
        cy.style( obj.style );
      }

      if( obj.zoom != null && obj.zoom !== _p.zoom ){
        cy.zoom( obj.zoom );
      }

      if( obj.pan ){
        if( obj.pan.x !== _p.pan.x || obj.pan.y !== _p.pan.y ){
          cy.pan( obj.pan );
        }
      }

      if( obj.data ){
        cy.data( obj.data );
      }

      let fields = [
        'minZoom', 'maxZoom', 'zoomingEnabled', 'userZoomingEnabled',
        'panningEnabled', 'userPanningEnabled',
        'boxSelectionEnabled',
        'autolock', 'autoungrabify', 'autounselectify',
        'multiClickDebounceTime'
      ];

      for( let i = 0; i < fields.length; i++ ){
        let f = fields[ i ];

        if( obj[ f ] != null ){
          cy[ f ]( obj[ f ] );
        }
      }

      cy.endBatch();

      return this; // chaining
    } else { // get
      let flat = !!obj;
      let json = {};

      if( flat ){
        json.elements = this.elements().map( ele => ele.json() );
      } else {
        json.elements = {};

        eles.forEach( function( ele ){
          let group = ele.group();

          if( !json.elements[ group ] ){
            json.elements[ group ] = [];
          }

          json.elements[ group ].push( ele.json() );
        } );
      }

      if( this._private.styleEnabled ){
        json.style = cy.style().json();
      }

      json.data =  util.copy( cy.data() );

      let options = _p.options;

      json.zoomingEnabled = _p.zoomingEnabled;
      json.userZoomingEnabled = _p.userZoomingEnabled;
      json.zoom = _p.zoom;
      json.minZoom = _p.minZoom;
      json.maxZoom = _p.maxZoom;
      json.panningEnabled = _p.panningEnabled;
      json.userPanningEnabled = _p.userPanningEnabled;
      json.pan = util.copy( _p.pan );
      json.boxSelectionEnabled = _p.boxSelectionEnabled;
      json.renderer = util.copy( options.renderer );
      json.hideEdgesOnViewport = options.hideEdgesOnViewport;
      json.textureOnViewport = options.textureOnViewport;
      json.wheelSensitivity = options.wheelSensitivity;
      json.motionBlur = options.motionBlur;
      json.multiClickDebounceTime = options.multiClickDebounceTime;

      return json;
    }
  }

} );

corefn.$id = corefn.getElementById;

[
  addRemove,
  animation,
  events,
  exportFormat,
  layout,
  notification,
  renderer,
  search,
  style,
  viewport,
  data
].forEach( function( props ){
  util.extend( corefn, props );
} );

export default Core;
