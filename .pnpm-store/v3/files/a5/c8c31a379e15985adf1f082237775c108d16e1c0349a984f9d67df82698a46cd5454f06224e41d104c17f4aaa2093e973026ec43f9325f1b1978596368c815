/* global Set */

const undef = typeof undefined;

class ObjectSet {
  constructor( arrayOrObjectSet ){
    this._obj = Object.create(null);
    this.size = 0;

    if( arrayOrObjectSet != null ){
      let arr;

      if( arrayOrObjectSet.instanceString != null && arrayOrObjectSet.instanceString() === this.instanceString() ){
        arr = arrayOrObjectSet.toArray();
      } else {
        arr = arrayOrObjectSet;
      }

      for( let i = 0; i < arr.length; i++ ){
        this.add( arr[i] );
      }
    }
  }

  instanceString(){
    return 'set';
  }

  add( val ){
    let o = this._obj;

    if( o[ val ] !== 1 ){
      o[ val ] = 1;
      this.size++;
    }
  }

  delete( val ){
    let o = this._obj;

    if( o[ val ] === 1 ){
      o[ val ] = 0;
      this.size--;
    }
  }

  clear(){
    this._obj = Object.create(null);
  }

  has( val ){
    return this._obj[ val ] === 1;
  }

  toArray(){
    return Object.keys( this._obj ).filter( key => this.has(key) );
  }

  forEach( callback, thisArg ){
    return this.toArray().forEach( callback, thisArg );
  }
}

export default typeof Set !== undef ? Set : ObjectSet;
