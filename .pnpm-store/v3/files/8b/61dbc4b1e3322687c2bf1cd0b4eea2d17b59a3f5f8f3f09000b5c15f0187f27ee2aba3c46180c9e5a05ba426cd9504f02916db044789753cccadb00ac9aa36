import easings from './easings.mjs';
import ease from './ease.mjs';
import * as is from '../../is.mjs';
import {bound} from '../../math.mjs';

function step( self, ani, now, isCore ){
  let isEles = !isCore;
  let _p = self._private;
  let ani_p = ani._private;
  let pEasing = ani_p.easing;
  let startTime = ani_p.startTime;
  let cy = isCore ? self : self.cy();
  let style = cy.style();

  if( !ani_p.easingImpl ){

    if( pEasing == null ){ // use default
      ani_p.easingImpl = easings[ 'linear' ];

    } else { // then define w/ name
      let easingVals;

      if( is.string( pEasing ) ){
        let easingProp = style.parse( 'transition-timing-function', pEasing );

        easingVals = easingProp.value;

      } else { // then assume preparsed array
        easingVals = pEasing;
      }

      let name, args;

      if( is.string( easingVals ) ){
        name = easingVals;
        args = [];
      } else {
        name = easingVals[1];
        args = easingVals.slice( 2 ).map( function( n ){ return +n; } );
      }

      if( args.length > 0 ){ // create with args
        if( name === 'spring' ){
          args.push( ani_p.duration ); // need duration to generate spring
        }

        ani_p.easingImpl = easings[ name ].apply( null, args );
      } else { // static impl by name
        ani_p.easingImpl = easings[ name ];
      }
    }

  }

  let easing = ani_p.easingImpl;
  let percent;

  if( ani_p.duration === 0 ){
    percent = 1;
  } else {
    percent = (now - startTime) / ani_p.duration;
  }

  if( ani_p.applying ){
    percent = ani_p.progress;
  }

  if( percent < 0 ){
    percent = 0;
  } else if( percent > 1 ){
    percent = 1;
  }

  if( ani_p.delay == null ){ // then update

    let startPos = ani_p.startPosition;
    let endPos = ani_p.position;

    if( endPos && isEles && !self.locked() ){
      let newPos = {};

      if( valid( startPos.x, endPos.x ) ){
        newPos.x = ease( startPos.x, endPos.x, percent, easing );
      }

      if( valid( startPos.y, endPos.y ) ){
        newPos.y = ease( startPos.y, endPos.y, percent, easing );
      }

      self.position( newPos );
    }

    let startPan = ani_p.startPan;
    let endPan = ani_p.pan;
    let pan = _p.pan;
    let animatingPan = endPan != null && isCore;
    if( animatingPan ){
      if( valid( startPan.x, endPan.x ) ){
        pan.x = ease( startPan.x, endPan.x, percent, easing );
      }

      if( valid( startPan.y, endPan.y ) ){
        pan.y = ease( startPan.y, endPan.y, percent, easing );
      }

      self.emit( 'pan' );
    }

    let startZoom = ani_p.startZoom;
    let endZoom = ani_p.zoom;
    let animatingZoom = endZoom != null && isCore;
    if( animatingZoom ){
      if( valid( startZoom, endZoom ) ){
        _p.zoom = bound( _p.minZoom, ease( startZoom, endZoom, percent, easing ), _p.maxZoom );
      }

      self.emit( 'zoom' );
    }

    if( animatingPan || animatingZoom ){
      self.emit( 'viewport' );
    }

    let props = ani_p.style;
    if( props && props.length > 0 && isEles ){
      for( let i = 0; i < props.length; i++ ){
        let prop = props[ i ];
        let name = prop.name;
        let end = prop;
        let start = ani_p.startStyle[ name ];
        let propSpec = style.properties[ start.name ];
        let easedVal = ease( start, end, percent, easing, propSpec );

        style.overrideBypass( self, name, easedVal );
      } // for props

      self.emit('style');

    } // if

  }

  ani_p.progress = percent;

  return percent;
}

function valid( start, end ){
  if( start == null || end == null ){
    return false;
  }

  if( is.number( start ) && is.number( end ) ){
    return true;
  } else if( (start) && (end) ){
    return true;
  }

  return false;
}

export default step;
