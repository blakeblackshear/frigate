import * as util from '../util/index.mjs';

let rendererDefaults = util.defaults({
  hideEdgesOnViewport: false,
  textureOnViewport: false,
  motionBlur: false,
  motionBlurOpacity: 0.05,
  pixelRatio: undefined,
  desktopTapThreshold: 4,
  touchTapThreshold: 8,
  wheelSensitivity: 1,
  debug: false,
  showFps: false,
  
  // webgl options
  webgl: false,
  webglDebug: false,
  webglDebugShowAtlases: false,
  // defaults good for mobile
  webglTexSize: 2048,
  webglTexRows: 36,
  webglTexRowsNodes: 18,
  webglBatchSize: 2048,
  webglTexPerBatch: 14,
  webglBgColor: [255, 255, 255]
});

let corefn = ({

  renderTo: function( context, zoom, pan, pxRatio ){
    let r = this._private.renderer;

    r.renderTo( context, zoom, pan, pxRatio );
    return this;
  },

  renderer: function(){
    return this._private.renderer;
  },

  forceRender: function(){
    this.notify('draw');

    return this;
  },

  resize: function(){
    this.invalidateSize();

    this.emitAndNotify('resize');

    return this;
  },

  initRenderer: function( options ){
    let cy = this;

    let RendererProto = cy.extension( 'renderer', options.name );
    if( RendererProto == null ){
      util.error( `Can not initialise: No such renderer \`${options.name}\` found. Did you forget to import it and \`cytoscape.use()\` it?` );
      return;
    }

    if( options.wheelSensitivity !== undefined ){
      util.warn(`You have set a custom wheel sensitivity.  This will make your app zoom unnaturally when using mainstream mice.  You should change this value from the default only if you can guarantee that all your users will use the same hardware and OS configuration as your current machine.`);
    }

    let rOpts = rendererDefaults(options);

    rOpts.cy = cy;

    cy._private.renderer = new RendererProto( rOpts );

    this.notify('init');
  },

  destroyRenderer: function(){
    let cy = this;

    cy.notify('destroy'); // destroy the renderer

    let domEle = cy.container();
    if( domEle ){
      domEle._cyreg = null;

      while( domEle.childNodes.length > 0 ){
        domEle.removeChild( domEle.childNodes[0] );
      }
    }

    cy._private.renderer = null; // to be extra safe, remove the ref
    cy.mutableElements().forEach(function( ele ){
      let _p = ele._private;
      _p.rscratch = {};
      _p.rstyle = {};
      _p.animation.current = [];
      _p.animation.queue = [];
    });
  },

  onRender: function( fn ){
    return this.on('render', fn);
  },

  offRender: function( fn ){
    return this.off('render', fn);
  }

});

corefn.invalidateDimensions = corefn.resize;

export default corefn;
