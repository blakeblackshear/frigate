let corefn = ({

  png: function( options ){
    let renderer = this._private.renderer;
    options = options || {};

    return renderer.png( options );
  },

  jpg: function( options ){
    let renderer = this._private.renderer;
    options = options || {};

    options.bg = options.bg || '#fff';

    return renderer.jpg( options );
  }

});

corefn.jpeg = corefn.jpg;

export default corefn;
