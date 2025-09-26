import Map from '../../../map.mjs';
import Set from'../../../set.mjs';
import * as util from '../../../util/index.mjs';

// Allows lookups for (ele, lvl) => cache.
// Uses keys so elements may share the same cache.
class ElementTextureCacheLookup {
  constructor(getKey, doesEleInvalidateKey = util.falsify){
    this.idsByKey = new Map();
    this.keyForId = new Map();
    this.cachesByLvl = new Map();
    this.lvls = [];
    this.getKey = getKey;
    this.doesEleInvalidateKey = doesEleInvalidateKey;
  }

  getIdsFor(key){
    if( key == null ){
      util.error(`Can not get id list for null key`);
    }

    let { idsByKey } = this;
    let ids = this.idsByKey.get(key);

    if( !ids ){
      ids = new Set();

      idsByKey.set(key, ids);
    }

    return ids;
  }

  addIdForKey(key, id){
    if( key != null ){
      this.getIdsFor(key).add(id);
    }
  }

  deleteIdForKey(key, id){
    if( key != null ){
      this.getIdsFor(key).delete(id);
    }
  }

  getNumberOfIdsForKey(key){
    if( key == null ){
      return 0;
    } else {
      return this.getIdsFor(key).size;
    }
  }

  updateKeyMappingFor(ele){
    let id = ele.id();
    let prevKey = this.keyForId.get(id);
    let currKey = this.getKey(ele);

    this.deleteIdForKey(prevKey, id);

    this.addIdForKey(currKey, id);

    this.keyForId.set(id, currKey);
  }

  deleteKeyMappingFor(ele){
    let id = ele.id();
    let prevKey = this.keyForId.get(id);

    this.deleteIdForKey(prevKey, id);

    this.keyForId.delete(id);
  }

  keyHasChangedFor(ele){
    let id = ele.id();
    let prevKey = this.keyForId.get(id);
    let newKey = this.getKey(ele);

    return prevKey !== newKey;
  }

  isInvalid(ele){
    return this.keyHasChangedFor(ele) || this.doesEleInvalidateKey(ele);
  }

  getCachesAt(lvl){
    let { cachesByLvl, lvls } = this;
    let caches = cachesByLvl.get(lvl);

    if( !caches ){
      caches = new Map();

      cachesByLvl.set(lvl, caches);
      lvls.push(lvl);
    }

    return caches;
  }

  getCache(key, lvl){
    return this.getCachesAt(lvl).get(key);
  }

  get(ele, lvl){
    let key = this.getKey(ele);
    let cache = this.getCache(key, lvl);

    // getting for an element may need to add to the id list b/c eles can share keys
    if( cache != null ){
      this.updateKeyMappingFor(ele);
    }

    return cache;
  }

  getForCachedKey(ele, lvl){
    let key = this.keyForId.get(ele.id()); // n.b. use cached key, not newly computed key
    let cache = this.getCache(key, lvl);

    return cache;
  }

  hasCache(key, lvl){
    return this.getCachesAt(lvl).has(key);
  }

  has(ele, lvl){
    let key = this.getKey(ele);

    return this.hasCache(key, lvl);
  }

  setCache(key, lvl, cache){
    cache.key = key;

    this.getCachesAt(lvl).set(key, cache);
  }

  set(ele, lvl, cache){
    let key = this.getKey(ele);

    this.setCache(key, lvl, cache);
    this.updateKeyMappingFor(ele);
  }

  deleteCache(key, lvl){
    this.getCachesAt(lvl).delete(key);
  }

  delete(ele, lvl){
    let key = this.getKey(ele);

    this.deleteCache(key, lvl);
  }

  invalidateKey(key){
    this.lvls.forEach( lvl => this.deleteCache(key, lvl) );
  }

  // returns true if no other eles reference the invalidated cache (n.b. other eles may need the cache with the same key)
  invalidate(ele){
    let id = ele.id();
    let key = this.keyForId.get(id); // n.b. use stored key rather than current (potential key)

    this.deleteKeyMappingFor(ele);

    let entireKeyInvalidated = this.doesEleInvalidateKey(ele);

    if( entireKeyInvalidated ){ // clear mapping for current key
      this.invalidateKey(key);
    }

    return entireKeyInvalidated || this.getNumberOfIdsForKey(key) === 0;
  }
}

export default ElementTextureCacheLookup;
