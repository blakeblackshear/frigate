export const DEFAULT_HASH_SEED = 9261;
const K = 65599; // 37 also works pretty well
export const DEFAULT_HASH_SEED_ALT = 5381;

export const hashIterableInts = function( iterator, seed = DEFAULT_HASH_SEED ){ // sdbm/string-hash
  let hash = seed;
  let entry;

  for( ;; ){
    entry = iterator.next();

    if( entry.done ){ break; }

    hash = ((hash * K) + entry.value) | 0;
  }

  return hash;
};

export const hashInt = function( num, seed = DEFAULT_HASH_SEED ){ // sdbm/string-hash
  return ((seed * K) + num) | 0;
};

export const hashIntAlt = function( num, seed = DEFAULT_HASH_SEED_ALT ){ // djb2/string-hash
  return ((seed << 5) + seed + num) | 0;
};

export const combineHashes = function(hash1, hash2){
  return hash1 * 0x200000 + hash2;
};

export const combineHashesArray = function(hashes){
  return hashes[0] * 0x200000 + hashes[1];
};

export const hashArrays = function(hashes1, hashes2){
  return [
    hashInt(hashes1[0], hashes2[0]),
    hashIntAlt(hashes1[1], hashes2[1])
  ];
};

export const hashIntsArray = function( ints, seed ){
  let entry = { value: 0, done: false };
  let i = 0;
  let length = ints.length;

  let iterator = {
    next(){
      if( i < length ){
        entry.value = ints[i++];
      } else {
        entry.done = true;
      }

      return entry;
    }
  };

  return hashIterableInts( iterator, seed );
};

export const hashString = function( str, seed ){
  let entry = { value: 0, done: false };
  let i = 0;
  let length = str.length;

  let iterator = {
    next(){
      if( i < length ){
        entry.value = str.charCodeAt(i++);
      } else {
        entry.done = true;
      }

      return entry;
    }
  };

  return hashIterableInts( iterator, seed );
};

export const hashStrings = function(){
  return hashStringsArray( arguments );
};

export const hashStringsArray = function( strs ){
  let hash;

  for( let i = 0; i < strs.length; i++ ){
    let str = strs[i];

    if( i === 0 ){
      hash = hashString( str );
    } else {
      hash = hashString( str, hash );
    }
  }

  return hash;
};
