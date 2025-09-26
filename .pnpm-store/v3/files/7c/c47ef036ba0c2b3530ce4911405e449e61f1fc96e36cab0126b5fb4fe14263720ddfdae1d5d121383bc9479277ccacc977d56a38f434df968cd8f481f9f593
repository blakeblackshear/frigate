let corefn = ({
  notify: function( eventName, eventEles ){
    let _p = this._private;

    if( this.batching() ){
      _p.batchNotifications = _p.batchNotifications || {};

      let eles = _p.batchNotifications[ eventName ] = _p.batchNotifications[ eventName ] || this.collection();

      if( eventEles != null ){
        eles.merge( eventEles );
      }

      return; // notifications are disabled during batching
    }

    if( !_p.notificationsEnabled ){ return; } // exit on disabled

    let renderer = this.renderer();

    // exit if destroy() called on core or renderer in between frames #1499 #1528
    if( this.destroyed() || !renderer ){ return; }

    renderer.notify( eventName, eventEles );
  },

  notifications: function( bool ){
    let p = this._private;

    if( bool === undefined ){
      return p.notificationsEnabled;
    } else {
      p.notificationsEnabled = bool ? true : false;
    }

    return this;
  },

  noNotifications: function( callback ){
    this.notifications( false );
    callback();
    this.notifications( true );
  },

  batching: function(){
    return this._private.batchCount > 0;
  },

  startBatch: function(){
    let _p = this._private;

    if( _p.batchCount == null ){
      _p.batchCount = 0;
    }

    if( _p.batchCount === 0 ){
      _p.batchStyleEles = this.collection();
      _p.batchNotifications = {};
    }

    _p.batchCount++;

    return this;
  },

  endBatch: function(){
    let _p = this._private;

    if( _p.batchCount === 0 ){ return this; }

    _p.batchCount--;

    if( _p.batchCount === 0 ){
      // update style for dirty eles
      _p.batchStyleEles.updateStyle();

      let renderer = this.renderer();

      // notify the renderer of queued eles and event types
      Object.keys( _p.batchNotifications ).forEach( eventName => {
        let eles = _p.batchNotifications[eventName];

        if( eles.empty() ){
          renderer.notify( eventName );
        } else {
          renderer.notify( eventName, eles );
        }
      } );
    }

    return this;
  },

  batch: function( callback ){
    this.startBatch();
    callback();
    this.endBatch();

    return this;
  },

  // for backwards compatibility
  batchData: function( map ){
    let cy = this;

    return this.batch( function(){
      let ids = Object.keys( map );

      for( let i = 0; i < ids.length; i++ ){
        let id = ids[i];
        let data = map[ id ];
        let ele = cy.getElementById( id );

        ele.data( data );
      }
    } );
  }
});

export default corefn;
