import * as is from '../is.mjs';
import * as math from '../math.mjs';

let defaultSelectionType = 'single';

let corefn = ({

  autolock: function( bool ){
    if( bool !== undefined ){
      this._private.autolock = bool ? true : false;
    } else {
      return this._private.autolock;
    }

    return this; // chaining
  },

  autoungrabify: function( bool ){
    if( bool !== undefined ){
      this._private.autoungrabify = bool ? true : false;
    } else {
      return this._private.autoungrabify;
    }

    return this; // chaining
  },

  autounselectify: function( bool ){
    if( bool !== undefined ){
      this._private.autounselectify = bool ? true : false;
    } else {
      return this._private.autounselectify;
    }

    return this; // chaining
  },

  selectionType: function( selType ){
    let _p = this._private;

    if( _p.selectionType == null ){
      _p.selectionType = defaultSelectionType;
    }

    if( selType !== undefined ){
      if( selType === 'additive' || selType === 'single' ){
        _p.selectionType = selType;
      }
    } else {
      return _p.selectionType;
    }

    return this;
  },

  panningEnabled: function( bool ){
    if( bool !== undefined ){
      this._private.panningEnabled = bool ? true : false;
    } else {
      return this._private.panningEnabled;
    }

    return this; // chaining
  },

  userPanningEnabled: function( bool ){
    if( bool !== undefined ){
      this._private.userPanningEnabled = bool ? true : false;
    } else {
      return this._private.userPanningEnabled;
    }

    return this; // chaining
  },

  zoomingEnabled: function( bool ){
    if( bool !== undefined ){
      this._private.zoomingEnabled = bool ? true : false;
    } else {
      return this._private.zoomingEnabled;
    }

    return this; // chaining
  },

  userZoomingEnabled: function( bool ){
    if( bool !== undefined ){
      this._private.userZoomingEnabled = bool ? true : false;
    } else {
      return this._private.userZoomingEnabled;
    }

    return this; // chaining
  },

  boxSelectionEnabled: function( bool ){
    if( bool !== undefined ){
      this._private.boxSelectionEnabled = bool ? true : false;
    } else {
      return this._private.boxSelectionEnabled;
    }

    return this; // chaining
  },

  pan: function(){
    let args = arguments;
    let pan = this._private.pan;
    let dim, val, dims, x, y;

    switch( args.length ){
    case 0: // .pan()
      return pan;

    case 1:

      if( is.string( args[0] ) ){ // .pan('x')
        dim = args[0];
        return pan[ dim ];

      } else if( is.plainObject( args[0] ) ){ // .pan({ x: 0, y: 100 })
        if( !this._private.panningEnabled ){
          return this;
        }

        dims = args[0];
        x = dims.x;
        y = dims.y;

        if( is.number( x ) ){
          pan.x = x;
        }

        if( is.number( y ) ){
          pan.y = y;
        }

        this.emit( 'pan viewport' );
      }
      break;

    case 2: // .pan('x', 100)
      if( !this._private.panningEnabled ){
        return this;
      }

      dim = args[0];
      val = args[1];

      if( (dim === 'x' || dim === 'y') && is.number( val ) ){
        pan[ dim ] = val;
      }

      this.emit( 'pan viewport' );
      break;

    default:
      break; // invalid
    }

    this.notify('viewport');

    return this; // chaining
  },

  panBy: function( arg0, arg1 ){
    let args = arguments;
    let pan = this._private.pan;
    let dim, val, dims, x, y;

    if( !this._private.panningEnabled ){
      return this;
    }

    switch( args.length ){
    case 1:

      if( is.plainObject( arg0 ) ){ // .panBy({ x: 0, y: 100 })
        dims = args[0];
        x = dims.x;
        y = dims.y;

        if( is.number( x ) ){
          pan.x += x;
        }

        if( is.number( y ) ){
          pan.y += y;
        }

        this.emit( 'pan viewport' );
      }
      break;

    case 2: // .panBy('x', 100)
      dim = arg0;
      val = arg1;

      if( (dim === 'x' || dim === 'y') && is.number( val ) ){
        pan[ dim ] += val;
      }

      this.emit( 'pan viewport' );
      break;

    default:
      break; // invalid
    }

    this.notify('viewport');

    return this; // chaining
  },

  gc: function() {
    this.notify('gc');
  },

  fit: function( elements, padding ){
    let viewportState = this.getFitViewport( elements, padding );

    if( viewportState ){
      let _p = this._private;
      _p.zoom = viewportState.zoom;
      _p.pan = viewportState.pan;

      this.emit( 'pan zoom viewport' );

      this.notify('viewport');
    }

    return this; // chaining
  },

  getFitViewport: function( elements, padding ){
    if( is.number( elements ) && padding === undefined ){ // elements is optional
      padding = elements;
      elements = undefined;
    }

    if( !this._private.panningEnabled || !this._private.zoomingEnabled ){
      return;
    }

    let bb;

    if( is.string( elements ) ){
      let sel = elements;
      elements = this.$( sel );

    } else if( is.boundingBox( elements ) ){ // assume bb
      let bbe = elements;
      bb = {
        x1: bbe.x1,
        y1: bbe.y1,
        x2: bbe.x2,
        y2: bbe.y2
      };

      bb.w = bb.x2 - bb.x1;
      bb.h = bb.y2 - bb.y1;

    } else if( !is.elementOrCollection( elements ) ){
      elements = this.mutableElements();
    }

    if( is.elementOrCollection( elements ) && elements.empty() ){ return; } // can't fit to nothing

    bb = bb || elements.boundingBox();

    let w = this.width();
    let h = this.height();
    let zoom;
    padding = is.number( padding ) ? padding : 0;

    if( !isNaN( w ) && !isNaN( h ) && w > 0 && h > 0 && !isNaN( bb.w ) && !isNaN( bb.h ) &&  bb.w > 0 && bb.h > 0 ){
      zoom = Math.min( (w - 2 * padding) / bb.w, (h - 2 * padding) / bb.h );

      // crop zoom
      zoom = zoom > this._private.maxZoom ? this._private.maxZoom : zoom;
      zoom = zoom < this._private.minZoom ? this._private.minZoom : zoom;

      let pan = { // now pan to middle
        x: (w - zoom * ( bb.x1 + bb.x2 )) / 2,
        y: (h - zoom * ( bb.y1 + bb.y2 )) / 2
      };

      return {
        zoom: zoom,
        pan: pan
      };
    }

    return;
  },

  zoomRange: function( min, max ){
    let _p = this._private;

    if( max == null ){
      let opts = min;

      min = opts.min;
      max = opts.max;
    }

    if( is.number( min ) && is.number( max ) && min <= max ){
      _p.minZoom = min;
      _p.maxZoom = max;
    } else if( is.number( min ) && max === undefined && min <= _p.maxZoom ){
      _p.minZoom = min;
    } else if( is.number( max ) && min === undefined && max >= _p.minZoom ){
      _p.maxZoom = max;
    }

    return this;
  },

  minZoom: function( zoom ){
    if( zoom === undefined ){
      return this._private.minZoom;
    } else {
      return this.zoomRange({ min: zoom });
    }
  },

  maxZoom: function( zoom ){
    if( zoom === undefined ){
      return this._private.maxZoom;
    } else {
      return this.zoomRange({ max: zoom });
    }
  },

  getZoomedViewport: function( params ){
    let _p = this._private;
    let currentPan = _p.pan;
    let currentZoom = _p.zoom;
    let pos; // in rendered px
    let zoom;
    let bail = false;

    if( !_p.zoomingEnabled ){ // zooming disabled
      bail = true;
    }

    if( is.number( params ) ){ // then set the zoom
      zoom = params;

    } else if( is.plainObject( params ) ){ // then zoom about a point
      zoom = params.level;

      if( params.position != null ){
        pos = math.modelToRenderedPosition( params.position, currentZoom, currentPan );
      } else if( params.renderedPosition != null ){
        pos = params.renderedPosition;
      }

      if( pos != null && !_p.panningEnabled ){ // panning disabled
        bail = true;
      }
    }

    // crop zoom
    zoom = zoom > _p.maxZoom ? _p.maxZoom : zoom;
    zoom = zoom < _p.minZoom ? _p.minZoom : zoom;

    // can't zoom with invalid params
    if( bail || !is.number( zoom ) || zoom === currentZoom || ( pos != null && (!is.number( pos.x ) || !is.number( pos.y )) ) ){
      return null;
    }

    if( pos != null ){ // set zoom about position
      let pan1 = currentPan;
      let zoom1 = currentZoom;
      let zoom2 = zoom;

      let pan2 = {
        x: -zoom2 / zoom1 * (pos.x - pan1.x) + pos.x,
        y: -zoom2 / zoom1 * (pos.y - pan1.y) + pos.y
      };

      return {
        zoomed: true,
        panned: true,
        zoom: zoom2,
        pan: pan2
      };

    } else { // just set the zoom
      return {
        zoomed: true,
        panned: false,
        zoom: zoom,
        pan: currentPan
      };
    }
  },

  zoom: function( params ){
    if( params === undefined ){ // get
      return this._private.zoom;
    } else { // set
      let vp = this.getZoomedViewport( params );
      let _p = this._private;

      if( vp == null || !vp.zoomed ){ return this; }

      _p.zoom = vp.zoom;

      if( vp.panned ){
        _p.pan.x = vp.pan.x;
        _p.pan.y = vp.pan.y;
      }

      this.emit( 'zoom' + ( vp.panned ? ' pan' : '' ) + ' viewport' );

      this.notify('viewport');

      return this; // chaining
    }
  },

  viewport: function( opts ){
    let _p = this._private;
    let zoomDefd = true;
    let panDefd = true;
    let events = []; // to trigger
    let zoomFailed = false;
    let panFailed = false;

    if( !opts ){ return this; }
    if( !is.number( opts.zoom ) ){ zoomDefd = false; }
    if( !is.plainObject( opts.pan ) ){ panDefd = false; }
    if( !zoomDefd && !panDefd ){ return this; }

    if( zoomDefd ){
      let z = opts.zoom;

      if( z < _p.minZoom || z > _p.maxZoom || !_p.zoomingEnabled ){
        zoomFailed = true;

      } else {
        _p.zoom = z;

        events.push( 'zoom' );
      }
    }

    if( panDefd && (!zoomFailed || !opts.cancelOnFailedZoom) && _p.panningEnabled ){
      let p = opts.pan;

      if( is.number( p.x ) ){
        _p.pan.x = p.x;
        panFailed = false;
      }

      if( is.number( p.y ) ){
        _p.pan.y = p.y;
        panFailed = false;
      }

      if( !panFailed ){
        events.push( 'pan' );
      }
    }

    if( events.length > 0 ){
      events.push( 'viewport' );
      this.emit( events.join( ' ' ) );

      this.notify('viewport');
    }

    return this; // chaining
  },

  center: function( elements ){
    let pan = this.getCenterPan( elements );

    if( pan ){
      this._private.pan = pan;

      this.emit( 'pan viewport' );

      this.notify('viewport');
    }

    return this; // chaining
  },

  getCenterPan: function( elements, zoom ){
    if( !this._private.panningEnabled ){
      return;
    }

    if( is.string( elements ) ){
      let selector = elements;
      elements = this.mutableElements().filter( selector );
    } else if( !is.elementOrCollection( elements ) ){
      elements = this.mutableElements();
    }

    if( elements.length === 0 ){ return; } // can't centre pan to nothing

    let bb = elements.boundingBox();
    let w = this.width();
    let h = this.height();
    zoom = zoom === undefined ? this._private.zoom : zoom;

    let pan = { // middle
      x: (w - zoom * ( bb.x1 + bb.x2 )) / 2,
      y: (h - zoom * ( bb.y1 + bb.y2 )) / 2
    };

    return pan;
  },

  reset: function(){
    if( !this._private.panningEnabled || !this._private.zoomingEnabled ){
      return this;
    }

    this.viewport( {
      pan: { x: 0, y: 0 },
      zoom: 1
    } );

    return this; // chaining
  },

  invalidateSize: function(){
    this._private.sizeCache = null;
  },

  size: function(){
    let _p = this._private;
    let container = _p.container;
    let cy = this;

    return ( _p.sizeCache = _p.sizeCache || ( container ? (function(){
      let style = cy.window().getComputedStyle( container );
      let val = function( name ){ return parseFloat( style.getPropertyValue( name ) ); };

      return {
        width: container.clientWidth - val('padding-left') - val('padding-right'),
        height: container.clientHeight - val('padding-top') - val('padding-bottom')
      };
    })() : { // fallback if no container (not 0 b/c can be used for dividing etc)
      width: 1,
      height: 1
    } ) );
  },

  width: function(){
    return this.size().width;
  },

  height: function(){
    return this.size().height;
  },

  extent: function(){
    let pan = this._private.pan;
    let zoom = this._private.zoom;
    let rb = this.renderedExtent();

    let b = {
      x1: ( rb.x1 - pan.x ) / zoom,
      x2: ( rb.x2 - pan.x ) / zoom,
      y1: ( rb.y1 - pan.y ) / zoom,
      y2: ( rb.y2 - pan.y ) / zoom
    };

    b.w = b.x2 - b.x1;
    b.h = b.y2 - b.y1;

    return b;
  },

  renderedExtent: function(){
    let width = this.width();
    let height = this.height();

    return {
      x1: 0,
      y1: 0,
      x2: width,
      y2: height,
      w: width,
      h: height
    };
  },
  
  multiClickDebounceTime: function ( int ){
    if( int ) (this._private.multiClickDebounceTime = int);
    else return this._private.multiClickDebounceTime;
    return this; // chaining
  }
});

// aliases
corefn.centre = corefn.center;

// backwards compatibility
corefn.autolockNodes = corefn.autolock;
corefn.autoungrabifyNodes = corefn.autoungrabify;

export default corefn;
