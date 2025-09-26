import Promise from '../promise.mjs';

let define = {

  eventAliasesOn: function( proto ){
    let p = proto;

    p.addListener = p.listen = p.bind = p.on;
    p.unlisten = p.unbind = p.off = p.removeListener;
    p.trigger = p.emit;

    // this is just a wrapper alias of .on()
    p.pon = p.promiseOn = function( events, selector ){
      let self = this;
      let args = Array.prototype.slice.call( arguments, 0 );

      return new Promise( function( resolve, reject ){
        let callback = function( e ){
          self.off.apply( self, offArgs );

          resolve( e );
        };

        let onArgs = args.concat( [ callback ] );
        let offArgs = onArgs.concat( [] );

        self.on.apply( self, onArgs );
      } );
    };
  },

}; // define

export default define;
