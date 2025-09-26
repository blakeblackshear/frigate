import * as util from './util/index.mjs';
import * as is from './is.mjs';
import Promise from './promise.mjs';

let Animation = function( target, opts, opts2 ){
  let isCore = is.core(target);
  let isEle = !isCore;

  let _p = this._private = util.extend( {
    duration: 1000
  }, opts, opts2 );

  _p.target = target;
  _p.style = _p.style || _p.css;
  _p.started = false;
  _p.playing = false;
  _p.hooked = false;
  _p.applying = false;
  _p.progress = 0;
  _p.completes = [];
  _p.frames = [];

  if( _p.complete && is.fn( _p.complete ) ){
    _p.completes.push( _p.complete );
  }

  if( isEle ){
    let pos = target.position();

    _p.startPosition = _p.startPosition || {
      x: pos.x,
      y: pos.y
    };

    _p.startStyle = _p.startStyle || target.cy().style().getAnimationStartStyle( target, _p.style );
  }

  if( isCore ){
    let pan = target.pan();

    _p.startPan = {
      x: pan.x,
      y: pan.y
    };

    _p.startZoom = target.zoom();
  }

  // for future timeline/animations impl
  this.length = 1;
  this[0] = this;
};

let anifn = Animation.prototype;

util.extend( anifn, {

  instanceString: function(){ return 'animation'; },

  hook: function(){
    let _p = this._private;

    if( !_p.hooked ){
      // add to target's animation queue
      let q;
      let tAni = _p.target._private.animation;
      if( _p.queue ){
        q = tAni.queue;
      } else {
        q = tAni.current;
      }
      q.push( this );

      // add to the animation loop pool
      if( is.elementOrCollection( _p.target ) ){
        _p.target.cy().addToAnimationPool( _p.target );
      }

      _p.hooked = true;
    }

    return this;
  },

  play: function(){
    let _p = this._private;

    // autorewind
    if( _p.progress === 1 ){
      _p.progress = 0;
    }

    _p.playing = true;
    _p.started = false; // needs to be started by animation loop
    _p.stopped = false;

    this.hook();

    // the animation loop will start the animation...

    return this;
  },

  playing: function(){
    return this._private.playing;
  },

  apply: function(){
    let _p = this._private;

    _p.applying = true;
    _p.started = false; // needs to be started by animation loop
    _p.stopped = false;

    this.hook();

    // the animation loop will apply the animation at this progress

    return this;
  },

  applying: function(){
    return this._private.applying;
  },

  pause: function(){
    let _p = this._private;

    _p.playing = false;
    _p.started = false;

    return this;
  },

  stop: function(){
    let _p = this._private;

    _p.playing = false;
    _p.started = false;
    _p.stopped = true; // to be removed from animation queues

    return this;
  },

  rewind: function(){
    return this.progress( 0 );
  },

  fastforward: function(){
    return this.progress( 1 );
  },

  time: function( t ){
    let _p = this._private;

    if( t === undefined ){
      return _p.progress * _p.duration;
    } else {
      return this.progress( t / _p.duration );
    }
  },

  progress: function( p ){
    let _p = this._private;
    let wasPlaying = _p.playing;

    if( p === undefined ){
      return _p.progress;
    } else {
      if( wasPlaying ){
        this.pause();
      }

      _p.progress = p;
      _p.started = false;

      if( wasPlaying ){
        this.play();
      }
    }

    return this;
  },

  completed: function(){
    return this._private.progress === 1;
  },

  reverse: function(){
    let _p = this._private;
    let wasPlaying = _p.playing;

    if( wasPlaying ){
      this.pause();
    }

    _p.progress = 1 - _p.progress;
    _p.started = false;

    let swap = function( a, b ){
      let _pa = _p[ a ];

      if( _pa == null ){ return; }

      _p[ a ] = _p[ b ];
      _p[ b ] = _pa;
    };

    swap( 'zoom', 'startZoom' );
    swap( 'pan', 'startPan' );
    swap( 'position', 'startPosition' );

    // swap styles
    if( _p.style ){
      for( let i = 0; i < _p.style.length; i++ ){
        let prop = _p.style[ i ];
        let name = prop.name;
        let startStyleProp = _p.startStyle[ name ];

        _p.startStyle[ name ] = prop;
        _p.style[ i ] = startStyleProp;
      }
    }

    if( wasPlaying ){
      this.play();
    }

    return this;
  },

  promise: function( type ){
    let _p = this._private;

    let arr;

    switch( type ){
      case 'frame':
        arr = _p.frames;
        break;
      default:
      case 'complete':
      case 'completed':
        arr = _p.completes;
    }

    return new Promise( function( resolve, reject ){
      arr.push( function(){
        resolve();
      } );
    } );
  }

} );

anifn.complete = anifn.completed;
anifn.run = anifn.play;
anifn.running = anifn.playing;

export default Animation;
