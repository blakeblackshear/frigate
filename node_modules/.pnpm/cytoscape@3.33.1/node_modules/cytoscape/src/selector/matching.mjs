import { matches as queryMatches } from './query-type-match.mjs';
import Type from './type.mjs';

// filter an existing collection
let filter = function( collection ){
  let self = this;

  // for 1 id #foo queries, just get the element
  if( self.length === 1 && self[0].checks.length === 1 && self[0].checks[0].type === Type.ID ){
    return collection.getElementById( self[0].checks[0].value ).collection();
  }

  let selectorFunction = function( element ){
    for( let j = 0; j < self.length; j++ ){
      let query = self[ j ];

      if( queryMatches( query, element ) ){
        return true;
      }
    }

    return false;
  };

  if( self.text() == null ){
    selectorFunction = function(){ return true; };
  }

  return collection.filter( selectorFunction );
}; // filter

// does selector match a single element?
let matches = function( ele ){
  let self = this;

  for( let j = 0; j < self.length; j++ ){
    let query = self[ j ];

    if( queryMatches( query, ele ) ){
      return true;
    }
  }

  return false;
}; // matches

export default { matches, filter };
