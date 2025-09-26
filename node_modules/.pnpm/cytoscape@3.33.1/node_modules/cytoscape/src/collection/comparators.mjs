import Selector from '../selector/index.mjs';

let elesfn = ({
  allAre: function( selector ){
    let selObj = new Selector( selector );

    return this.every(function( ele ){
      return selObj.matches( ele );
    });
  },

  is: function( selector ){
    let selObj = new Selector( selector );

    return this.some(function( ele ){
      return selObj.matches( ele );
    });
  },

  some: function( fn, thisArg ){
    for( let i = 0; i < this.length; i++ ){
      let ret = !thisArg ? fn( this[ i ], i, this ) : fn.apply( thisArg, [ this[ i ], i, this ] );

      if( ret ){
        return true;
      }
    }

    return false;
  },

  every: function( fn, thisArg ){
    for( let i = 0; i < this.length; i++ ){
      let ret = !thisArg ? fn( this[ i ], i, this ) : fn.apply( thisArg, [ this[ i ], i, this ] );

      if( !ret ){
        return false;
      }
    }

    return true;
  },

  same: function( collection ){
    // cheap collection ref check
    if( this === collection ){ return true; }

    collection = this.cy().collection( collection );

    let thisLength = this.length;
    let collectionLength = collection.length;

    // cheap length check
    if( thisLength !== collectionLength ){ return false; }

    // cheap element ref check
    if( thisLength === 1 ){ return this[0] === collection[0]; }

    return this.every(function( ele ){
      return collection.hasElementWithId( ele.id() );
    });
  },

  anySame: function( collection ){
    collection = this.cy().collection( collection );

    return this.some(function( ele ){
      return collection.hasElementWithId( ele.id() );
    });
  },

  allAreNeighbors: function( collection ){
    collection = this.cy().collection( collection );

    let nhood = this.neighborhood();

    return collection.every(function( ele ){
      return nhood.hasElementWithId( ele.id() );
    });
  },

  contains: function( collection ){
    collection = this.cy().collection( collection );

    let self = this;

    return collection.every(function( ele ){
      return self.hasElementWithId( ele.id() );
    });
  }
});

elesfn.allAreNeighbours = elesfn.allAreNeighbors;
elesfn.has = elesfn.contains;
elesfn.equal = elesfn.equals = elesfn.same;

export default elesfn;
