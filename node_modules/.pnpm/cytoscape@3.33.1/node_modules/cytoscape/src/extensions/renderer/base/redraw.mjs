import * as util from '../../../util/index.mjs';

var BRp = {};

BRp.timeToRender = function(){
  return this.redrawTotalTime / this.redrawCount;
};

BRp.redraw = function( options ){
  options = options || util.staticEmptyObject();

  var r = this;

  if( r.averageRedrawTime === undefined ){ r.averageRedrawTime = 0; }
  if( r.lastRedrawTime === undefined ){ r.lastRedrawTime = 0; }
  if( r.lastDrawTime === undefined ){ r.lastDrawTime = 0; }

  r.requestedFrame = true;
  r.renderOptions = options;
};

BRp.beforeRender = function( fn, priority ){
  // the renderer can't add tick callbacks when destroyed
  if( this.destroyed ){ return; }

  if( priority == null ){
    util.error('Priority is not optional for beforeRender');
  }

  var cbs = this.beforeRenderCallbacks;

  cbs.push({ fn: fn, priority: priority });

  // higher priority callbacks executed first
  cbs.sort(function( a, b ){ return b.priority - a.priority; });
};

var beforeRenderCallbacks = function( r, willDraw, startTime ){
  var cbs = r.beforeRenderCallbacks;

  for( var i = 0; i < cbs.length; i++ ){
    cbs[i].fn( willDraw, startTime );
  }
};

BRp.startRenderLoop = function(){
  var r = this;
  var cy = r.cy;

  if( r.renderLoopStarted ){
    return;
  } else {
    r.renderLoopStarted = true;
  }

  var renderFn = function( requestTime ){
    if( r.destroyed ){ return; }

    if( cy.batching() ){
      // mid-batch, none of these should run
      // - pre frame hooks (calculations, texture caches, style, etc.)
      // - any drawing
    } else if( r.requestedFrame && !r.skipFrame ){
      beforeRenderCallbacks( r, true, requestTime );

      var startTime = util.performanceNow();

      r.render( r.renderOptions );

      var endTime = r.lastDrawTime = util.performanceNow();

      if( r.averageRedrawTime === undefined ){
        r.averageRedrawTime = endTime - startTime;
      }

      if( r.redrawCount === undefined ){
        r.redrawCount = 0;
      }

      r.redrawCount++;

      if( r.redrawTotalTime === undefined ){
        r.redrawTotalTime = 0;
      }

      var duration = endTime - startTime;

      r.redrawTotalTime += duration;
      r.lastRedrawTime = duration;

      // use a weighted average with a bias from the previous average so we don't spike so easily
      r.averageRedrawTime = r.averageRedrawTime / 2 + duration / 2;

      r.requestedFrame = false;
    } else {
      beforeRenderCallbacks( r, false, requestTime );
    }

    r.skipFrame = false;

    util.requestAnimationFrame( renderFn );
  };

  util.requestAnimationFrame( renderFn );

};

export default BRp;
