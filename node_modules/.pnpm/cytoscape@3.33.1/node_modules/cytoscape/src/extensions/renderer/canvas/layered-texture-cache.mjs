import * as util from '../../../util/index.mjs';
import * as math from '../../../math.mjs';
import Heap from '../../../heap.mjs';
import * as is from '../../../is.mjs';
import defs from './texture-cache-defs.mjs';

var defNumLayers = 1; // default number of layers to use
var minLvl = -4; // when scaling smaller than that we don't need to re-render
var maxLvl = 2; // when larger than this scale just render directly (caching is not helpful)
var maxZoom = 3.99; // beyond this zoom level, layered textures are not used
var deqRedrawThreshold = 50; // time to batch redraws together from dequeueing to allow more dequeueing calcs to happen in the meanwhile
var refineEleDebounceTime = 50; // time to debounce sharper ele texture updates
var disableEleImgSmoothing = true; // when drawing eles on layers from an ele cache ; crisper and more performant when true
var deqCost = 0.15; // % of add'l rendering cost allowed for dequeuing ele caches each frame
var deqAvgCost = 0.1; // % of add'l rendering cost compared to average overall redraw time
var deqNoDrawCost = 0.9; // % of avg frame time that can be used for dequeueing when not drawing
var deqFastCost = 0.9; // % of frame time to be used when >60fps
var maxDeqSize = 1; // number of eles to dequeue and render at higher texture in each batch
var invalidThreshold = 250; // time threshold for disabling b/c of invalidations
var maxLayerArea = 4000 * 4000; // layers can't be bigger than this
var maxLayerDim = 32767; // maximum size for the width/height of layer canvases
var alwaysQueue = true; // never draw all the layers in a level on a frame; draw directly until all dequeued
var useHighQualityEleTxrReqs = true; // whether to use high quality ele txr requests (generally faster and cheaper in the longterm)

var useEleTxrCaching = true; // whether to use individual ele texture caching underneath this cache

// var log = function(){ console.log.apply( console, arguments ); };

var LayeredTextureCache = function( renderer ){
  var self = this;
  var r = self.renderer = renderer;
  var cy = r.cy;

  self.layersByLevel = {}; // e.g. 2 => [ layer1, layer2, ..., layerN ]

  self.firstGet = true;

  self.lastInvalidationTime = util.performanceNow() - 2*invalidThreshold;

  self.skipping = false;

  self.eleTxrDeqs = cy.collection();

  self.scheduleElementRefinement = util.debounce( function(){
    self.refineElementTextures( self.eleTxrDeqs );

    self.eleTxrDeqs.unmerge( self.eleTxrDeqs );
  }, refineEleDebounceTime );

  r.beforeRender(function( willDraw, now ){
    if( now - self.lastInvalidationTime <= invalidThreshold ){
      self.skipping = true;
    } else {
      self.skipping = false;
    }
  }, r.beforeRenderPriorities.lyrTxrSkip);

  var qSort = function(a, b){
    return b.reqs - a.reqs;
  };

  self.layersQueue = new Heap( qSort );

  self.setupDequeueing();
};

var LTCp = LayeredTextureCache.prototype;

var layerIdPool = 0;
var MAX_INT = Math.pow(2, 53) - 1;

LTCp.makeLayer = function( bb, lvl ){
  var scale = Math.pow( 2, lvl );

  var w = Math.ceil( bb.w * scale );
  var h = Math.ceil( bb.h * scale );

  var canvas = this.renderer.makeOffscreenCanvas(w, h);

  var layer = {
    id: (layerIdPool = ++layerIdPool % MAX_INT ),
    bb: bb,
    level: lvl,
    width: w,
    height: h,
    canvas: canvas,
    context: canvas.getContext('2d'),
    eles: [],
    elesQueue: [],
    reqs: 0
  };

  // log('make layer %s with w %s and h %s and lvl %s', layer.id, layer.width, layer.height, layer.level);

  var cxt = layer.context;
  var dx = -layer.bb.x1;
  var dy = -layer.bb.y1;

  // do the transform on creation to save cycles (it's the same for all eles)
  cxt.scale( scale, scale );
  cxt.translate( dx, dy );

  return layer;
};

LTCp.getLayers = function( eles, pxRatio, lvl ){
  var self = this;
  var r = self.renderer;
  var cy = r.cy;
  var zoom = cy.zoom();
  var firstGet = self.firstGet;

  self.firstGet = false;

  // log('--\nget layers with %s eles', eles.length);
  //log eles.map(function(ele){ return ele.id() }) );

  if( lvl == null ){
    lvl = Math.ceil( math.log2( zoom * pxRatio ) );

    if( lvl < minLvl ){
      lvl = minLvl;
    } else if( zoom >= maxZoom || lvl > maxLvl ){
      return null;
    }
  }

  self.validateLayersElesOrdering( lvl, eles );

  var layersByLvl = self.layersByLevel;
  var scale = Math.pow( 2, lvl );
  var layers = layersByLvl[ lvl ] = layersByLvl[ lvl ] || [];
  var bb;

  var lvlComplete = self.levelIsComplete( lvl, eles );
  var tmpLayers;

  var checkTempLevels = function(){
    var canUseAsTmpLvl = function( l ){
      self.validateLayersElesOrdering( l, eles );

      if( self.levelIsComplete( l, eles ) ){
        tmpLayers = layersByLvl[l];
        return true;
      }
    };

    var checkLvls = function( dir ){
      if( tmpLayers ){ return; }

      for( var l = lvl + dir; minLvl <= l && l <= maxLvl; l += dir ){
        if( canUseAsTmpLvl(l) ){ break; }
      }
    };

    checkLvls( +1 );
    checkLvls( -1 );

    // remove the invalid layers; they will be replaced as needed later in this function
    for( var i = layers.length - 1; i >= 0; i-- ){
      var layer = layers[i];

      if( layer.invalid ){
        util.removeFromArray( layers, layer );
      }
    }
  };

  if( !lvlComplete ){
    // if the current level is incomplete, then use the closest, best quality layerset temporarily
    // and later queue the current layerset so we can get the proper quality level soon

    checkTempLevels();

  } else {
    // log('level complete, using existing layers\n--');
    return layers;
  }

  var getBb = function(){
    if( !bb ){
      bb = math.makeBoundingBox();

      for( var i = 0; i < eles.length; i++ ){
        math.updateBoundingBox( bb, eles[i].boundingBox() );
      }
    }

    return bb;
  };

  var makeLayer = function( opts ){
    opts = opts || {};

    var after = opts.after;

    getBb();

    var w = Math.ceil( bb.w * scale );
    var h = Math.ceil( bb.h * scale );
    
    if( w > maxLayerDim || h > maxLayerDim ){
      return null;
    }

    var area = w * h;

    if( area > maxLayerArea ){
      return null;
    }

    var layer = self.makeLayer( bb, lvl );

    if( after != null ){
      var index = layers.indexOf( after ) + 1;

      layers.splice( index, 0, layer );
    } else if( opts.insert === undefined || opts.insert ){
      // no after specified => first layer made so put at start
      layers.unshift( layer );
    }

    // if( tmpLayers ){
      //self.queueLayer( layer );
    // }

    return layer;
  };

  if( self.skipping && !firstGet ){
    // log('skip layers');
    return null;
  }

  // log('do layers');

  var layer = null;
  var maxElesPerLayer = eles.length / defNumLayers;
  var allowLazyQueueing = alwaysQueue && !firstGet;

  for( var i = 0; i < eles.length; i++ ){
    var ele = eles[i];
    var rs = ele._private.rscratch;
    var caches = rs.imgLayerCaches = rs.imgLayerCaches || {};

    // log('look at ele', ele.id());

    var existingLayer = caches[ lvl ];

    if( existingLayer ){
      // reuse layer for later eles
      // log('reuse layer for', ele.id());
      layer = existingLayer;
      continue;
    }

    if(
      !layer
      || layer.eles.length >= maxElesPerLayer
      || !math.boundingBoxInBoundingBox( layer.bb, ele.boundingBox() )
    ){
      // log('make new layer for ele %s', ele.id());

      layer = makeLayer({ insert: true, after: layer });

      // if now layer can be built then we can't use layers at this level
      if( !layer ){ return null; }

      // log('new layer with id %s', layer.id);
    }

    if( tmpLayers || allowLazyQueueing ){
      // log('queue ele %s in layer %s', ele.id(), layer.id);
      self.queueLayer( layer, ele );
    } else {
      // log('draw ele %s in layer %s', ele.id(), layer.id);
      self.drawEleInLayer( layer, ele, lvl, pxRatio );
    }

    layer.eles.push( ele );

    caches[ lvl ] = layer;
  }

  // log('--');

  if( tmpLayers ){ // then we only queued the current layerset and can't draw it yet
    return tmpLayers;
  }

  if( allowLazyQueueing ){
    // log('lazy queue level', lvl);
    return null;
  }

  return layers;
};

// a layer may want to use an ele cache of a higher level to avoid blurriness
// so the layer level might not equal the ele level
LTCp.getEleLevelForLayerLevel = function( lvl, pxRatio ){
  return lvl;
};

LTCp.drawEleInLayer = function( layer, ele, lvl, pxRatio ){
  var self = this;
  var r = this.renderer;
  var context = layer.context;
  var bb = ele.boundingBox();

  if( bb.w === 0 || bb.h === 0 || !ele.visible() ){ return; }

  lvl = self.getEleLevelForLayerLevel( lvl, pxRatio );

  if( disableEleImgSmoothing ){ r.setImgSmoothing( context, false ); }

  if( useEleTxrCaching ){
    r.drawCachedElement( context, ele, null, null, lvl, useHighQualityEleTxrReqs );
  } else { // if the element is not cacheable, then draw directly
    r.drawElement( context, ele );
  }

  if( disableEleImgSmoothing ){ r.setImgSmoothing( context, true ); }
};

LTCp.levelIsComplete = function( lvl, eles ){
  var self = this;
  var layers = self.layersByLevel[ lvl ];

  if( !layers || layers.length === 0 ){ return false; }

  var numElesInLayers = 0;

  for( var i = 0; i < layers.length; i++ ){
    var layer = layers[i];

    // if there are any eles needed to be drawn yet, the level is not complete
    if( layer.reqs > 0 ){ return false; }

    // if the layer is invalid, the level is not complete
    if( layer.invalid ){ return false; }

    numElesInLayers += layer.eles.length;
  }

  // we should have exactly the number of eles passed in to be complete
  if( numElesInLayers !== eles.length ){ return false; }

  return true;
};

LTCp.validateLayersElesOrdering = function( lvl, eles ){
  var layers = this.layersByLevel[ lvl ];

  if( !layers ){ return; }

  // if in a layer the eles are not in the same order, then the layer is invalid
  // (i.e. there is an ele in between the eles in the layer)

  for( var i = 0; i < layers.length; i++ ){
    var layer = layers[i];
    var offset = -1;

    // find the offset
    for( var j = 0; j < eles.length; j++ ){
      if( layer.eles[0] === eles[j] ){
        offset = j;
        break;
      }
    }

    if( offset < 0 ){
      // then the layer has nonexistent elements and is invalid
      this.invalidateLayer( layer );
      continue;
    }

    // the eles in the layer must be in the same continuous order, else the layer is invalid

    var o = offset;

    for( var j = 0; j < layer.eles.length; j++ ){
      if( layer.eles[j] !== eles[o+j] ){
        // log('invalidate based on ordering', layer.id);

        this.invalidateLayer( layer );
        break;
      }
    }
  }
};

LTCp.updateElementsInLayers = function( eles, update ){
  var self = this;
  var isEles = is.element( eles[0] );

  // collect udpated elements (cascaded from the layers) and update each
  // layer itself along the way
  for( var i = 0; i < eles.length; i++ ){
    var req = isEles ? null : eles[i];
    var ele = isEles ? eles[i] : eles[i].ele;
    var rs = ele._private.rscratch;
    var caches = rs.imgLayerCaches = rs.imgLayerCaches || {};

    for( var l = minLvl; l <= maxLvl; l++ ){
      var layer = caches[l];

      if( !layer ){ continue; }

      // if update is a request from the ele cache, then it affects only
      // the matching level
      if( req && self.getEleLevelForLayerLevel( layer.level ) !== req.level ){
        continue;
      }

      update( layer, ele, req );
    }
  }
};

LTCp.haveLayers = function(){
  var self = this;
  var haveLayers = false;

  for( var l = minLvl; l <= maxLvl; l++ ){
    var layers = self.layersByLevel[l];

    if( layers && layers.length > 0 ){
      haveLayers = true;
      break;
    }
  }

  return haveLayers;
};

LTCp.invalidateElements = function( eles ){
  var self = this;

  if( eles.length === 0 ){ return; }

  self.lastInvalidationTime = util.performanceNow();

  // log('update invalidate layer time from eles');

  if( eles.length === 0 || !self.haveLayers() ){ return; }

  self.updateElementsInLayers( eles, function invalAssocLayers( layer, ele, req ){
    self.invalidateLayer( layer );
  } );
};

LTCp.invalidateLayer = function( layer ){
  // log('update invalidate layer time');

  this.lastInvalidationTime = util.performanceNow();

  if( layer.invalid ){ return; } // save cycles

  var lvl = layer.level;
  var eles = layer.eles;
  var layers = this.layersByLevel[ lvl ];

   // log('invalidate layer', layer.id );

  util.removeFromArray( layers, layer );
  // layer.eles = [];

  layer.elesQueue = [];

  layer.invalid = true;

  if( layer.replacement ){
    layer.replacement.invalid = true;
  }

  for( var i = 0; i < eles.length; i++ ){
    var caches = eles[i]._private.rscratch.imgLayerCaches;

    if( caches ){
      caches[ lvl ] = null;
    }
  }
};

LTCp.refineElementTextures = function( eles ){
  var self = this;

  // log('refine', eles.length);

  self.updateElementsInLayers( eles, function refineEachEle( layer, ele, req ){
    var rLyr = layer.replacement;

    if( !rLyr ){
      rLyr = layer.replacement = self.makeLayer( layer.bb, layer.level );
      rLyr.replaces = layer;
      rLyr.eles = layer.eles;

       // log('make replacement layer %s for %s with level %s', rLyr.id, layer.id, rLyr.level);
    }

    if( !rLyr.reqs ){
      for( var i = 0; i < rLyr.eles.length; i++ ){
        self.queueLayer( rLyr, rLyr.eles[i] );
      }

       // log('queue replacement layer refinement', rLyr.id);
    }
  } );
};

LTCp.enqueueElementRefinement = function( ele ){
  if( !useEleTxrCaching ){ return; }

  this.eleTxrDeqs.merge( ele );
  this.scheduleElementRefinement();
};

LTCp.queueLayer = function( layer, ele ){
  var self = this;
  var q = self.layersQueue;
  var elesQ = layer.elesQueue;
  var hasId = elesQ.hasId = elesQ.hasId || {};

  // if a layer is going to be replaced, queuing is a waste of time
  if( layer.replacement ){ return; }

  if( ele ){
    if( hasId[ ele.id() ] ){
      return;
    }

    elesQ.push( ele );
    hasId[ ele.id() ] = true;
  }

  if( layer.reqs ){
    layer.reqs++;

    q.updateItem( layer );
  } else {
    layer.reqs = 1;

    q.push( layer );
  }
};

LTCp.dequeue = function( pxRatio ){
  var self = this;
  var q = self.layersQueue;
  var deqd = [];
  var eleDeqs = 0;

  while( eleDeqs < maxDeqSize ){
    if( q.size() === 0 ){ break; }

    var layer = q.peek();

    // if a layer has been or will be replaced, then don't waste time with it
    if( layer.replacement ){
       // log('layer %s in queue skipped b/c it already has a replacement', layer.id);
      q.pop();
      continue;
    }

    // if this is a replacement layer that has been superceded, then forget it
    if( layer.replaces && layer !== layer.replaces.replacement ){
       // log('layer is no longer the most uptodate replacement; dequeued', layer.id)
      q.pop();
      continue;
    }

    if( layer.invalid ){
       // log('replacement layer %s is invalid; dequeued', layer.id);
      q.pop();
      continue;
    }

    var ele = layer.elesQueue.shift();

    if( ele ){
       // log('dequeue layer %s', layer.id);

      self.drawEleInLayer( layer, ele, layer.level, pxRatio );

      eleDeqs++;
    }

    if( deqd.length === 0 ){
      // we need only one entry in deqd to queue redrawing etc
      deqd.push( true );
    }

    // if the layer has all its eles done, then remove from the queue
    if( layer.elesQueue.length === 0 ){
      q.pop();

      layer.reqs = 0;

       // log('dequeue of layer %s complete', layer.id);

      // when a replacement layer is dequeued, it replaces the old layer in the level
      if( layer.replaces ){
        self.applyLayerReplacement( layer );
      }

      self.requestRedraw();
    }
  }

  return deqd;
};

LTCp.applyLayerReplacement = function( layer ){
  var self = this;
  var layersInLevel = self.layersByLevel[ layer.level ];
  var replaced = layer.replaces;
  var index = layersInLevel.indexOf( replaced );

  // if the replaced layer is not in the active list for the level, then replacing
  // refs would be a mistake (i.e. overwriting the true active layer)
  if( index < 0 || replaced.invalid ){
     // log('replacement layer would have no effect', layer.id);
    return;
  }

  layersInLevel[ index ] = layer; // replace level ref

  // replace refs in eles
  for( var i = 0; i < layer.eles.length; i++ ){
    var _p = layer.eles[i]._private;
    var cache = _p.imgLayerCaches = _p.imgLayerCaches || {};

    if( cache ){
      cache[ layer.level ] = layer;
    }
  }

   // log('apply replacement layer %s over %s', layer.id, replaced.id);

  self.requestRedraw();
};

LTCp.requestRedraw = util.debounce( function(){
  var r = this.renderer;

  r.redrawHint( 'eles', true );
  r.redrawHint( 'drag', true );
  r.redraw();
}, 100 );

LTCp.setupDequeueing = defs.setupDequeueing({
  deqRedrawThreshold: deqRedrawThreshold,
  deqCost: deqCost,
  deqAvgCost: deqAvgCost,
  deqNoDrawCost: deqNoDrawCost,
  deqFastCost: deqFastCost,
  deq: function( self, pxRatio ){
    return self.dequeue( pxRatio );
  },
  onDeqd: util.noop,
  shouldRedraw: util.trueify,
  priority: function( self ){
    return self.renderer.beforeRenderPriorities.lyrTxrDeq;
  }
});

export default LayeredTextureCache;
