import * as util from '../util/index.mjs';
import * as is from '../is.mjs';
import get from 'lodash/get.js';
import set from 'lodash/set.js';
import toPath from 'lodash/toPath.js';

let define = {

  // access data field
  data: function( params ){
    let defaults = {
      field: 'data',
      bindingEvent: 'data',
      allowBinding: false,
      allowSetting: false,
      allowGetting: false,
      settingEvent: 'data',
      settingTriggersEvent: false,
      triggerFnName: 'trigger',
      immutableKeys: {}, // key => true if immutable
      updateStyle: false,
      beforeGet: function( self ){},
      beforeSet: function( self, obj ){},
      onSet: function( self ){},
      canSet: function( self ){ return true; }
    };
    params = util.extend( {}, defaults, params );

    return function dataImpl( name, value ){
      let p = params;
      let self = this;
      let selfIsArrayLike = self.length !== undefined;
      let all = selfIsArrayLike ? self : [ self ]; // put in array if not array-like
      let single = selfIsArrayLike ? self[0] : self;

      // .data('foo', ...)
      if (is.string(name)) { // set or get property
        let isPathLike = name.indexOf('.') !== -1; // there might be a normal field with a dot 
        let path = isPathLike && toPath(name);

        // .data('foo')
        if( p.allowGetting && value === undefined ){ // get

          let ret;
          if( single ){
            p.beforeGet( single );

            // check if it's path and a field with the same name doesn't exist
            if (path && single._private[ p.field ][ name ] === undefined) {
              ret = get(single._private[ p.field ], path);
            } else {
              ret = single._private[ p.field ][ name ];
            }
          }
          return ret;

        // .data('foo', 'bar')
        } else if( p.allowSetting && value !== undefined ){ // set
          let valid = !p.immutableKeys[ name ];
          if( valid ){
            let change = { [name]: value };

            p.beforeSet( self, change );

            for( let i = 0, l = all.length; i < l; i++ ){
              let ele = all[i];

              if( p.canSet( ele ) ){
                if (path && single._private[ p.field ][ name ] === undefined) {
                  set(ele._private[ p.field ], path, value);
                } else {
                  ele._private[ p.field ][ name ] = value;
                }
              }
            }

            // update mappers if asked
            if( p.updateStyle ){ self.updateStyle(); }

            // call onSet callback
            p.onSet( self );

            if( p.settingTriggersEvent ){
              self[ p.triggerFnName ]( p.settingEvent );
            }
          }
        }

      // .data({ 'foo': 'bar' })
      } else if( p.allowSetting && is.plainObject( name ) ){ // extend
        let obj = name;
        let k, v;
        let keys = Object.keys( obj );

        p.beforeSet( self, obj );

        for( let i = 0; i < keys.length; i++ ){
          k = keys[ i ];
          v = obj[ k ];

          let valid = !p.immutableKeys[ k ];
          if( valid ){
            for( let j = 0; j < all.length; j++ ){
              let ele = all[j];

              if( p.canSet( ele ) ){
                ele._private[ p.field ][ k ] = v;
              }
            }
          }
        }

        // update mappers if asked
        if( p.updateStyle ){ self.updateStyle(); }

        // call onSet callback
        p.onSet( self );

        if( p.settingTriggersEvent ){
          self[ p.triggerFnName ]( p.settingEvent );
        }

      // .data(function(){ ... })
      } else if( p.allowBinding && is.fn( name ) ){ // bind to event
        let fn = name;
        self.on( p.bindingEvent, fn );

      // .data()
      } else if( p.allowGetting && name === undefined ){ // get whole object
        let ret;
        if( single ){
          p.beforeGet( single );

          ret = single._private[ p.field ];
        }
        return ret;
      }

      return self; // maintain chainability
    }; // function
  }, // data

  // remove data field
  removeData: function( params ){
    let defaults = {
      field: 'data',
      event: 'data',
      triggerFnName: 'trigger',
      triggerEvent: false,
      immutableKeys: {} // key => true if immutable
    };
    params = util.extend( {}, defaults, params );

    return function removeDataImpl( names ){
      let p = params;
      let self = this;
      let selfIsArrayLike = self.length !== undefined;
      let all = selfIsArrayLike ? self : [ self ]; // put in array if not array-like

      // .removeData('foo bar')
      if( is.string( names ) ){ // then get the list of keys, and delete them
        let keys = names.split( /\s+/ );
        let l = keys.length;

        for( let i = 0; i < l; i++ ){ // delete each non-empty key
          let key = keys[ i ];
          if( is.emptyString( key ) ){ continue; }

          let valid = !p.immutableKeys[ key ]; // not valid if immutable
          if( valid ){
            for( let i_a = 0, l_a = all.length; i_a < l_a; i_a++ ){
              all[ i_a ]._private[ p.field ][ key ] = undefined;
            }
          }
        }

        if( p.triggerEvent ){
          self[ p.triggerFnName ]( p.event );
        }

      // .removeData()
      } else if( names === undefined ){ // then delete all keys

        for( let i_a = 0, l_a = all.length; i_a < l_a; i_a++ ){
          let _privateFields = all[ i_a ]._private[ p.field ];
          let keys = Object.keys( _privateFields );

          for( let i = 0; i < keys.length; i++ ){
            let key = keys[i];
            let validKeyToDelete = !p.immutableKeys[ key ];

            if( validKeyToDelete ){
              _privateFields[ key ] = undefined;
            }
          }
        }

        if( p.triggerEvent ){
          self[ p.triggerFnName ]( p.event );
        }
      }

      return self; // maintain chaining
    }; // function
  }, // removeData
}; // define

export default define;
