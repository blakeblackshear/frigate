export const memoize = ( fn, keyFn ) => {
  if( !keyFn ){
    keyFn = function(){
      if( arguments.length === 1 ){
        return arguments[0];
      } else if( arguments.length === 0 ){
        return 'undefined';
      }

      let args = [];

      for( let i = 0; i < arguments.length; i++ ){
        args.push( arguments[ i ] );
      }

      return args.join( '$' );
    };
  }

  let memoizedFn = function(){
    let self = this;
    let args = arguments;
    let ret;
    let k = keyFn.apply( self, args );
    let cache = memoizedFn.cache;

    if( !(ret = cache[ k ]) ){
      ret = cache[ k ] = fn.apply( self, args );
    }

    return ret;
  };

  memoizedFn.cache = {};

  return memoizedFn;
};
