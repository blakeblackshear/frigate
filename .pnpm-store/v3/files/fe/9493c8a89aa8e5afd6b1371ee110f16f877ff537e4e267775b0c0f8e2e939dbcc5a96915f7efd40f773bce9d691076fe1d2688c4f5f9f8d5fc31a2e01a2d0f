import * as is from '../is.mjs';
import * as util from '../util/index.mjs';

let cache = function( fn, name ){
  return function traversalCache( arg1, arg2, arg3, arg4 ){
    let selectorOrEles = arg1;
    let eles = this;
    let key;

    if( selectorOrEles == null ){
      key = '';
    } else if( is.elementOrCollection( selectorOrEles ) && selectorOrEles.length === 1 ){
      key = selectorOrEles.id();
    }

    if( eles.length === 1 && key ){
      let _p = eles[0]._private;
      let tch = _p.traversalCache = _p.traversalCache || {};
      let ch = tch[ name ] = tch[ name ] || [];
      let hash = util.hashString( key );
      let cacheHit = ch[ hash ];

      if( cacheHit ){
        return cacheHit;
      } else {
        return ( ch[ hash ] = fn.call( eles, arg1, arg2, arg3, arg4 ) );
      }
    } else {
      return fn.call( eles, arg1, arg2, arg3, arg4 );
    }
  };
};

export default cache;
