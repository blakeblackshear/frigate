(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('react'), require('react/jsx-runtime'), require('react-dom')) :
  typeof define === 'function' && define.amd ? define(['exports', 'react', 'react/jsx-runtime', 'react-dom'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ReactLogViewer = {}, global.React, global.jsxRuntime, global.ReactDOM));
})(this, (function (exports, React, jsxRuntime, reactDom) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var React__default = /*#__PURE__*/_interopDefaultLegacy(React);

  /**
   * @license
   * MIT License
   * 
   * Copyright (c) 2014-present, Lee Byron and other contributors.
   * 
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   * 
   * The above copyright notice and this permission notice shall be included in all
   * copies or substantial portions of the Software.
   * 
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   * SOFTWARE.
   */
  // Used for setting prototype methods that IE8 chokes on.
  var DELETE = 'delete';
  // Constants describing the size of trie nodes.
  var SHIFT = 5; // Resulted in best performance after ______?
  var SIZE = 1 << SHIFT;
  var MASK = SIZE - 1;
  // A consistent shared value representing "not set" which equals nothing other
  // than itself, and nothing that could be provided externally.
  var NOT_SET = {};
  // Boolean references, Rough equivalent of `bool &`.
  function MakeRef() {
      return { value: false };
  }
  function SetRef(ref) {
      if (ref) {
          ref.value = true;
      }
  }
  // A function which returns a value representing an "owner" for transient writes
  // to tries. The return value will only ever equal itself, and will not equal
  // the return of any subsequent call of this function.
  function OwnerID() { }
  function ensureSize(iter) {
      // @ts-expect-error size should exists on Collection
      if (iter.size === undefined) {
          // @ts-expect-error size should exists on Collection, __iterate does exist on Collection
          iter.size = iter.__iterate(returnTrue);
      }
      // @ts-expect-error size should exists on Collection
      return iter.size;
  }
  function wrapIndex(iter, index) {
      // This implements "is array index" which the ECMAString spec defines as:
      //
      //     A String property name P is an array index if and only if
      //     ToString(ToUint32(P)) is equal to P and ToUint32(P) is not equal
      //     to 2^32−1.
      //
      // http://www.ecma-international.org/ecma-262/6.0/#sec-array-exotic-objects
      if (typeof index !== 'number') {
          var uint32Index = index >>> 0; // N >>> 0 is shorthand for ToUint32
          if ('' + uint32Index !== index || uint32Index === 4294967295) {
              return NaN;
          }
          index = uint32Index;
      }
      return index < 0 ? ensureSize(iter) + index : index;
  }
  function returnTrue() {
      return true;
  }
  function wholeSlice(begin, end, size) {
      return (((begin === 0 && !isNeg(begin)) ||
          (size !== undefined && begin <= -size)) &&
          (end === undefined || (size !== undefined && end >= size)));
  }
  function resolveBegin(begin, size) {
      return resolveIndex(begin, size, 0);
  }
  function resolveEnd(end, size) {
      return resolveIndex(end, size, size);
  }
  function resolveIndex(index, size, defaultIndex) {
      // Sanitize indices using this shorthand for ToInt32(argument)
      // http://www.ecma-international.org/ecma-262/6.0/#sec-toint32
      return index === undefined
          ? defaultIndex
          : isNeg(index)
              ? size === Infinity
                  ? size
                  : Math.max(0, size + index) | 0
              : size === undefined || size === index
                  ? index
                  : Math.min(size, index) | 0;
  }
  function isNeg(value) {
      // Account for -0 which is negative, but not less than 0.
      return value < 0 || (value === 0 && 1 / value === -Infinity);
  }

  // Note: value is unchanged to not break immutable-devtools.
  var IS_COLLECTION_SYMBOL = '@@__IMMUTABLE_ITERABLE__@@';
  /**
   * True if `maybeCollection` is a Collection, or any of its subclasses.
   *
   * ```js
   * import { isCollection, Map, List, Stack } from 'immutable';
   *
   * isCollection([]); // false
   * isCollection({}); // false
   * isCollection(Map()); // true
   * isCollection(List()); // true
   * isCollection(Stack()); // true
   * ```
   */
  function isCollection(maybeCollection) {
      return Boolean(maybeCollection &&
          // @ts-expect-error: maybeCollection is typed as `{}`, need to change in 6.0 to `maybeCollection && typeof maybeCollection === 'object' && IS_COLLECTION_SYMBOL in maybeCollection`
          maybeCollection[IS_COLLECTION_SYMBOL]);
  }

  var IS_KEYED_SYMBOL = '@@__IMMUTABLE_KEYED__@@';
  /**
   * True if `maybeKeyed` is a Collection.Keyed, or any of its subclasses.
   *
   * ```js
   * import { isKeyed, Map, List, Stack } from 'immutable';
   *
   * isKeyed([]); // false
   * isKeyed({}); // false
   * isKeyed(Map()); // true
   * isKeyed(List()); // false
   * isKeyed(Stack()); // false
   * ```
   */
  function isKeyed(maybeKeyed) {
      return Boolean(maybeKeyed &&
          // @ts-expect-error: maybeKeyed is typed as `{}`, need to change in 6.0 to `maybeKeyed && typeof maybeKeyed === 'object' && IS_KEYED_SYMBOL in maybeKeyed`
          maybeKeyed[IS_KEYED_SYMBOL]);
  }

  var IS_INDEXED_SYMBOL = '@@__IMMUTABLE_INDEXED__@@';
  /**
   * True if `maybeIndexed` is a Collection.Indexed, or any of its subclasses.
   *
   * ```js
   * import { isIndexed, Map, List, Stack, Set } from 'immutable';
   *
   * isIndexed([]); // false
   * isIndexed({}); // false
   * isIndexed(Map()); // false
   * isIndexed(List()); // true
   * isIndexed(Stack()); // true
   * isIndexed(Set()); // false
   * ```
   */
  function isIndexed(maybeIndexed) {
      return Boolean(maybeIndexed &&
          // @ts-expect-error: maybeIndexed is typed as `{}`, need to change in 6.0 to `maybeIndexed && typeof maybeIndexed === 'object' && IS_INDEXED_SYMBOL in maybeIndexed`
          maybeIndexed[IS_INDEXED_SYMBOL]);
  }

  /**
   * True if `maybeAssociative` is either a Keyed or Indexed Collection.
   *
   * ```js
   * import { isAssociative, Map, List, Stack, Set } from 'immutable';
   *
   * isAssociative([]); // false
   * isAssociative({}); // false
   * isAssociative(Map()); // true
   * isAssociative(List()); // true
   * isAssociative(Stack()); // true
   * isAssociative(Set()); // false
   * ```
   */
  function isAssociative(maybeAssociative) {
      return isKeyed(maybeAssociative) || isIndexed(maybeAssociative);
  }

  var Collection = function Collection(value) {
    // eslint-disable-next-line no-constructor-return
    return isCollection(value) ? value : Seq(value);
  };

  var KeyedCollection = /*@__PURE__*/(function (Collection) {
    function KeyedCollection(value) {
      // eslint-disable-next-line no-constructor-return
      return isKeyed(value) ? value : KeyedSeq(value);
    }

    if ( Collection ) KeyedCollection.__proto__ = Collection;
    KeyedCollection.prototype = Object.create( Collection && Collection.prototype );
    KeyedCollection.prototype.constructor = KeyedCollection;

    return KeyedCollection;
  }(Collection));

  var IndexedCollection = /*@__PURE__*/(function (Collection) {
    function IndexedCollection(value) {
      // eslint-disable-next-line no-constructor-return
      return isIndexed(value) ? value : IndexedSeq(value);
    }

    if ( Collection ) IndexedCollection.__proto__ = Collection;
    IndexedCollection.prototype = Object.create( Collection && Collection.prototype );
    IndexedCollection.prototype.constructor = IndexedCollection;

    return IndexedCollection;
  }(Collection));

  var SetCollection = /*@__PURE__*/(function (Collection) {
    function SetCollection(value) {
      // eslint-disable-next-line no-constructor-return
      return isCollection(value) && !isAssociative(value) ? value : SetSeq(value);
    }

    if ( Collection ) SetCollection.__proto__ = Collection;
    SetCollection.prototype = Object.create( Collection && Collection.prototype );
    SetCollection.prototype.constructor = SetCollection;

    return SetCollection;
  }(Collection));

  Collection.Keyed = KeyedCollection;
  Collection.Indexed = IndexedCollection;
  Collection.Set = SetCollection;

  var IS_SEQ_SYMBOL = '@@__IMMUTABLE_SEQ__@@';
  /**
   * True if `maybeSeq` is a Seq.
   */
  function isSeq(maybeSeq) {
      return Boolean(maybeSeq &&
          // @ts-expect-error: maybeSeq is typed as `{}`, need to change in 6.0 to `maybeSeq && typeof maybeSeq === 'object' && MAYBE_SEQ_SYMBOL in maybeSeq`
          maybeSeq[IS_SEQ_SYMBOL]);
  }

  var IS_RECORD_SYMBOL = '@@__IMMUTABLE_RECORD__@@';
  /**
   * True if `maybeRecord` is a Record.
   */
  function isRecord(maybeRecord) {
      return Boolean(maybeRecord &&
          // @ts-expect-error: maybeRecord is typed as `{}`, need to change in 6.0 to `maybeRecord && typeof maybeRecord === 'object' && IS_RECORD_SYMBOL in maybeRecord`
          maybeRecord[IS_RECORD_SYMBOL]);
  }

  /**
   * True if `maybeImmutable` is an Immutable Collection or Record.
   *
   * Note: Still returns true even if the collections is within a `withMutations()`.
   *
   * ```js
   * import { isImmutable, Map, List, Stack } from 'immutable';
   * isImmutable([]); // false
   * isImmutable({}); // false
   * isImmutable(Map()); // true
   * isImmutable(List()); // true
   * isImmutable(Stack()); // true
   * isImmutable(Map().asMutable()); // true
   * ```
   */
  function isImmutable(maybeImmutable) {
      return isCollection(maybeImmutable) || isRecord(maybeImmutable);
  }

  var IS_ORDERED_SYMBOL = '@@__IMMUTABLE_ORDERED__@@';
  function isOrdered(maybeOrdered) {
      return Boolean(maybeOrdered &&
          // @ts-expect-error: maybeOrdered is typed as `{}`, need to change in 6.0 to `maybeOrdered && typeof maybeOrdered === 'object' && IS_ORDERED_SYMBOL in maybeOrdered`
          maybeOrdered[IS_ORDERED_SYMBOL]);
  }

  var ITERATE_KEYS = 0;
  var ITERATE_VALUES = 1;
  var ITERATE_ENTRIES = 2;

  var REAL_ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
  var FAUX_ITERATOR_SYMBOL = '@@iterator';

  var ITERATOR_SYMBOL = REAL_ITERATOR_SYMBOL || FAUX_ITERATOR_SYMBOL;

  var Iterator = function Iterator(next) {
    this.next = next;
  };

  Iterator.prototype.toString = function toString () {
    return '[Iterator]';
  };

  Iterator.KEYS = ITERATE_KEYS;
  Iterator.VALUES = ITERATE_VALUES;
  Iterator.ENTRIES = ITERATE_ENTRIES;

  Iterator.prototype.inspect = Iterator.prototype.toSource = function () {
    return this.toString();
  };
  Iterator.prototype[ITERATOR_SYMBOL] = function () {
    return this;
  };

  function iteratorValue(type, k, v, iteratorResult) {
    var value =
      type === ITERATE_KEYS ? k : type === ITERATE_VALUES ? v : [k, v];
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
    iteratorResult
      ? (iteratorResult.value = value)
      : (iteratorResult = {
          value: value,
          done: false,
        });
    return iteratorResult;
  }

  function iteratorDone() {
    return { value: undefined, done: true };
  }

  function hasIterator(maybeIterable) {
    if (Array.isArray(maybeIterable)) {
      // IE11 trick as it does not support `Symbol.iterator`
      return true;
    }

    return !!getIteratorFn(maybeIterable);
  }

  function isIterator(maybeIterator) {
    return maybeIterator && typeof maybeIterator.next === 'function';
  }

  function getIterator(iterable) {
    var iteratorFn = getIteratorFn(iterable);
    return iteratorFn && iteratorFn.call(iterable);
  }

  function getIteratorFn(iterable) {
    var iteratorFn =
      iterable &&
      ((REAL_ITERATOR_SYMBOL && iterable[REAL_ITERATOR_SYMBOL]) ||
        iterable[FAUX_ITERATOR_SYMBOL]);
    if (typeof iteratorFn === 'function') {
      return iteratorFn;
    }
  }

  function isEntriesIterable(maybeIterable) {
    var iteratorFn = getIteratorFn(maybeIterable);
    return iteratorFn && iteratorFn === maybeIterable.entries;
  }

  function isKeysIterable(maybeIterable) {
    var iteratorFn = getIteratorFn(maybeIterable);
    return iteratorFn && iteratorFn === maybeIterable.keys;
  }

  var hasOwnProperty = Object.prototype.hasOwnProperty;

  function isArrayLike(value) {
      if (Array.isArray(value) || typeof value === 'string') {
          return true;
      }
      // @ts-expect-error "Type 'unknown' is not assignable to type 'boolean'" : convert to Boolean
      return (value &&
          typeof value === 'object' &&
          // @ts-expect-error check that `'length' in value &&`
          Number.isInteger(value.length) &&
          // @ts-expect-error check that `'length' in value &&`
          value.length >= 0 &&
          // @ts-expect-error check that `'length' in value &&`
          (value.length === 0
              ? // Only {length: 0} is considered Array-like.
                  Object.keys(value).length === 1
              : // An object is only Array-like if it has a property where the last value
                  // in the array-like may be found (which could be undefined).
                  // @ts-expect-error check that `'length' in value &&`
                  value.hasOwnProperty(value.length - 1)));
  }

  var Seq = /*@__PURE__*/(function (Collection) {
    function Seq(value) {
      // eslint-disable-next-line no-constructor-return
      return value === undefined || value === null
        ? emptySequence()
        : isImmutable(value)
          ? value.toSeq()
          : seqFromValue(value);
    }

    if ( Collection ) Seq.__proto__ = Collection;
    Seq.prototype = Object.create( Collection && Collection.prototype );
    Seq.prototype.constructor = Seq;

    Seq.prototype.toSeq = function toSeq () {
      return this;
    };

    Seq.prototype.toString = function toString () {
      return this.__toString('Seq {', '}');
    };

    Seq.prototype.cacheResult = function cacheResult () {
      if (!this._cache && this.__iterateUncached) {
        this._cache = this.entrySeq().toArray();
        this.size = this._cache.length;
      }
      return this;
    };

    // abstract __iterateUncached(fn, reverse)

    Seq.prototype.__iterate = function __iterate (fn, reverse) {
      var cache = this._cache;
      if (cache) {
        var size = cache.length;
        var i = 0;
        while (i !== size) {
          var entry = cache[reverse ? size - ++i : i++];
          if (fn(entry[1], entry[0], this) === false) {
            break;
          }
        }
        return i;
      }
      return this.__iterateUncached(fn, reverse);
    };

    // abstract __iteratorUncached(type, reverse)

    Seq.prototype.__iterator = function __iterator (type, reverse) {
      var cache = this._cache;
      if (cache) {
        var size = cache.length;
        var i = 0;
        return new Iterator(function () {
          if (i === size) {
            return iteratorDone();
          }
          var entry = cache[reverse ? size - ++i : i++];
          return iteratorValue(type, entry[0], entry[1]);
        });
      }
      return this.__iteratorUncached(type, reverse);
    };

    return Seq;
  }(Collection));

  var KeyedSeq = /*@__PURE__*/(function (Seq) {
    function KeyedSeq(value) {
      // eslint-disable-next-line no-constructor-return
      return value === undefined || value === null
        ? emptySequence().toKeyedSeq()
        : isCollection(value)
          ? isKeyed(value)
            ? value.toSeq()
            : value.fromEntrySeq()
          : isRecord(value)
            ? value.toSeq()
            : keyedSeqFromValue(value);
    }

    if ( Seq ) KeyedSeq.__proto__ = Seq;
    KeyedSeq.prototype = Object.create( Seq && Seq.prototype );
    KeyedSeq.prototype.constructor = KeyedSeq;

    KeyedSeq.prototype.toKeyedSeq = function toKeyedSeq () {
      return this;
    };

    return KeyedSeq;
  }(Seq));

  var IndexedSeq = /*@__PURE__*/(function (Seq) {
    function IndexedSeq(value) {
      // eslint-disable-next-line no-constructor-return
      return value === undefined || value === null
        ? emptySequence()
        : isCollection(value)
          ? isKeyed(value)
            ? value.entrySeq()
            : value.toIndexedSeq()
          : isRecord(value)
            ? value.toSeq().entrySeq()
            : indexedSeqFromValue(value);
    }

    if ( Seq ) IndexedSeq.__proto__ = Seq;
    IndexedSeq.prototype = Object.create( Seq && Seq.prototype );
    IndexedSeq.prototype.constructor = IndexedSeq;

    IndexedSeq.of = function of (/*...values*/) {
      return IndexedSeq(arguments);
    };

    IndexedSeq.prototype.toIndexedSeq = function toIndexedSeq () {
      return this;
    };

    IndexedSeq.prototype.toString = function toString () {
      return this.__toString('Seq [', ']');
    };

    return IndexedSeq;
  }(Seq));

  var SetSeq = /*@__PURE__*/(function (Seq) {
    function SetSeq(value) {
      // eslint-disable-next-line no-constructor-return
      return (
        isCollection(value) && !isAssociative(value) ? value : IndexedSeq(value)
      ).toSetSeq();
    }

    if ( Seq ) SetSeq.__proto__ = Seq;
    SetSeq.prototype = Object.create( Seq && Seq.prototype );
    SetSeq.prototype.constructor = SetSeq;

    SetSeq.of = function of (/*...values*/) {
      return SetSeq(arguments);
    };

    SetSeq.prototype.toSetSeq = function toSetSeq () {
      return this;
    };

    return SetSeq;
  }(Seq));

  Seq.isSeq = isSeq;
  Seq.Keyed = KeyedSeq;
  Seq.Set = SetSeq;
  Seq.Indexed = IndexedSeq;

  Seq.prototype[IS_SEQ_SYMBOL] = true;

  // #pragma Root Sequences

  var ArraySeq = /*@__PURE__*/(function (IndexedSeq) {
    function ArraySeq(array) {
      this._array = array;
      this.size = array.length;
    }

    if ( IndexedSeq ) ArraySeq.__proto__ = IndexedSeq;
    ArraySeq.prototype = Object.create( IndexedSeq && IndexedSeq.prototype );
    ArraySeq.prototype.constructor = ArraySeq;

    ArraySeq.prototype.get = function get (index, notSetValue) {
      return this.has(index) ? this._array[wrapIndex(this, index)] : notSetValue;
    };

    ArraySeq.prototype.__iterate = function __iterate (fn, reverse) {
      var array = this._array;
      var size = array.length;
      var i = 0;
      while (i !== size) {
        var ii = reverse ? size - ++i : i++;
        if (fn(array[ii], ii, this) === false) {
          break;
        }
      }
      return i;
    };

    ArraySeq.prototype.__iterator = function __iterator (type, reverse) {
      var array = this._array;
      var size = array.length;
      var i = 0;
      return new Iterator(function () {
        if (i === size) {
          return iteratorDone();
        }
        var ii = reverse ? size - ++i : i++;
        return iteratorValue(type, ii, array[ii]);
      });
    };

    return ArraySeq;
  }(IndexedSeq));

  var ObjectSeq = /*@__PURE__*/(function (KeyedSeq) {
    function ObjectSeq(object) {
      var keys = Object.keys(object).concat(
        Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(object) : []
      );
      this._object = object;
      this._keys = keys;
      this.size = keys.length;
    }

    if ( KeyedSeq ) ObjectSeq.__proto__ = KeyedSeq;
    ObjectSeq.prototype = Object.create( KeyedSeq && KeyedSeq.prototype );
    ObjectSeq.prototype.constructor = ObjectSeq;

    ObjectSeq.prototype.get = function get (key, notSetValue) {
      if (notSetValue !== undefined && !this.has(key)) {
        return notSetValue;
      }
      return this._object[key];
    };

    ObjectSeq.prototype.has = function has (key) {
      return hasOwnProperty.call(this._object, key);
    };

    ObjectSeq.prototype.__iterate = function __iterate (fn, reverse) {
      var object = this._object;
      var keys = this._keys;
      var size = keys.length;
      var i = 0;
      while (i !== size) {
        var key = keys[reverse ? size - ++i : i++];
        if (fn(object[key], key, this) === false) {
          break;
        }
      }
      return i;
    };

    ObjectSeq.prototype.__iterator = function __iterator (type, reverse) {
      var object = this._object;
      var keys = this._keys;
      var size = keys.length;
      var i = 0;
      return new Iterator(function () {
        if (i === size) {
          return iteratorDone();
        }
        var key = keys[reverse ? size - ++i : i++];
        return iteratorValue(type, key, object[key]);
      });
    };

    return ObjectSeq;
  }(KeyedSeq));
  ObjectSeq.prototype[IS_ORDERED_SYMBOL] = true;

  var CollectionSeq = /*@__PURE__*/(function (IndexedSeq) {
    function CollectionSeq(collection) {
      this._collection = collection;
      this.size = collection.length || collection.size;
    }

    if ( IndexedSeq ) CollectionSeq.__proto__ = IndexedSeq;
    CollectionSeq.prototype = Object.create( IndexedSeq && IndexedSeq.prototype );
    CollectionSeq.prototype.constructor = CollectionSeq;

    CollectionSeq.prototype.__iterateUncached = function __iterateUncached (fn, reverse) {
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      var collection = this._collection;
      var iterator = getIterator(collection);
      var iterations = 0;
      if (isIterator(iterator)) {
        var step;
        while (!(step = iterator.next()).done) {
          if (fn(step.value, iterations++, this) === false) {
            break;
          }
        }
      }
      return iterations;
    };

    CollectionSeq.prototype.__iteratorUncached = function __iteratorUncached (type, reverse) {
      if (reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }
      var collection = this._collection;
      var iterator = getIterator(collection);
      if (!isIterator(iterator)) {
        return new Iterator(iteratorDone);
      }
      var iterations = 0;
      return new Iterator(function () {
        var step = iterator.next();
        return step.done ? step : iteratorValue(type, iterations++, step.value);
      });
    };

    return CollectionSeq;
  }(IndexedSeq));

  // # pragma Helper functions

  var EMPTY_SEQ;

  function emptySequence() {
    return EMPTY_SEQ || (EMPTY_SEQ = new ArraySeq([]));
  }

  function keyedSeqFromValue(value) {
    var seq = maybeIndexedSeqFromValue(value);
    if (seq) {
      return seq.fromEntrySeq();
    }
    if (typeof value === 'object') {
      return new ObjectSeq(value);
    }
    throw new TypeError(
      'Expected Array or collection object of [k, v] entries, or keyed object: ' +
        value
    );
  }

  function indexedSeqFromValue(value) {
    var seq = maybeIndexedSeqFromValue(value);
    if (seq) {
      return seq;
    }
    throw new TypeError(
      'Expected Array or collection object of values: ' + value
    );
  }

  function seqFromValue(value) {
    var seq = maybeIndexedSeqFromValue(value);
    if (seq) {
      return isEntriesIterable(value)
        ? seq.fromEntrySeq()
        : isKeysIterable(value)
          ? seq.toSetSeq()
          : seq;
    }
    if (typeof value === 'object') {
      return new ObjectSeq(value);
    }
    throw new TypeError(
      'Expected Array or collection object of values, or keyed object: ' + value
    );
  }

  function maybeIndexedSeqFromValue(value) {
    return isArrayLike(value)
      ? new ArraySeq(value)
      : hasIterator(value)
        ? new CollectionSeq(value)
        : undefined;
  }

  var IS_MAP_SYMBOL = '@@__IMMUTABLE_MAP__@@';
  /**
   * True if `maybeMap` is a Map.
   *
   * Also true for OrderedMaps.
   */
  function isMap(maybeMap) {
      return Boolean(maybeMap &&
          // @ts-expect-error: maybeMap is typed as `{}`, need to change in 6.0 to `maybeMap && typeof maybeMap === 'object' && IS_MAP_SYMBOL in maybeMap`
          maybeMap[IS_MAP_SYMBOL]);
  }

  /**
   * True if `maybeOrderedMap` is an OrderedMap.
   */
  function isOrderedMap(maybeOrderedMap) {
      return isMap(maybeOrderedMap) && isOrdered(maybeOrderedMap);
  }

  /**
   * True if `maybeValue` is a JavaScript Object which has *both* `equals()`
   * and `hashCode()` methods.
   *
   * Any two instances of *value objects* can be compared for value equality with
   * `Immutable.is()` and can be used as keys in a `Map` or members in a `Set`.
   */
  function isValueObject(maybeValue) {
      return Boolean(maybeValue &&
          // @ts-expect-error: maybeValue is typed as `{}`
          typeof maybeValue.equals === 'function' &&
          // @ts-expect-error: maybeValue is typed as `{}`
          typeof maybeValue.hashCode === 'function');
  }

  /**
   * An extension of the "same-value" algorithm as [described for use by ES6 Map
   * and Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#Key_equality)
   *
   * NaN is considered the same as NaN, however -0 and 0 are considered the same
   * value, which is different from the algorithm described by
   * [`Object.is`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is).
   *
   * This is extended further to allow Objects to describe the values they
   * represent, by way of `valueOf` or `equals` (and `hashCode`).
   *
   * Note: because of this extension, the key equality of Immutable.Map and the
   * value equality of Immutable.Set will differ from ES6 Map and Set.
   *
   * ### Defining custom values
   *
   * The easiest way to describe the value an object represents is by implementing
   * `valueOf`. For example, `Date` represents a value by returning a unix
   * timestamp for `valueOf`:
   *
   *     var date1 = new Date(1234567890000); // Fri Feb 13 2009 ...
   *     var date2 = new Date(1234567890000);
   *     date1.valueOf(); // 1234567890000
   *     assert( date1 !== date2 );
   *     assert( Immutable.is( date1, date2 ) );
   *
   * Note: overriding `valueOf` may have other implications if you use this object
   * where JavaScript expects a primitive, such as implicit string coercion.
   *
   * For more complex types, especially collections, implementing `valueOf` may
   * not be performant. An alternative is to implement `equals` and `hashCode`.
   *
   * `equals` takes another object, presumably of similar type, and returns true
   * if it is equal. Equality is symmetrical, so the same result should be
   * returned if this and the argument are flipped.
   *
   *     assert( a.equals(b) === b.equals(a) );
   *
   * `hashCode` returns a 32bit integer number representing the object which will
   * be used to determine how to store the value object in a Map or Set. You must
   * provide both or neither methods, one must not exist without the other.
   *
   * Also, an important relationship between these methods must be upheld: if two
   * values are equal, they *must* return the same hashCode. If the values are not
   * equal, they might have the same hashCode; this is called a hash collision,
   * and while undesirable for performance reasons, it is acceptable.
   *
   *     if (a.equals(b)) {
   *       assert( a.hashCode() === b.hashCode() );
   *     }
   *
   * All Immutable collections are Value Objects: they implement `equals()`
   * and `hashCode()`.
   */
  function is(valueA, valueB) {
      if (valueA === valueB || (valueA !== valueA && valueB !== valueB)) {
          return true;
      }
      if (!valueA || !valueB) {
          return false;
      }
      if (typeof valueA.valueOf === 'function' &&
          typeof valueB.valueOf === 'function') {
          valueA = valueA.valueOf();
          valueB = valueB.valueOf();
          if (valueA === valueB || (valueA !== valueA && valueB !== valueB)) {
              return true;
          }
          if (!valueA || !valueB) {
              return false;
          }
      }
      return !!(isValueObject(valueA) &&
          isValueObject(valueB) &&
          valueA.equals(valueB));
  }

  var imul =
    typeof Math.imul === 'function' && Math.imul(0xffffffff, 2) === -2
      ? Math.imul
      : function imul(a, b) {
          a |= 0; // int
          b |= 0; // int
          var c = a & 0xffff;
          var d = b & 0xffff;
          // Shift by 0 fixes the sign on the high part.
          return (c * d + ((((a >>> 16) * d + c * (b >>> 16)) << 16) >>> 0)) | 0; // int
        };

  // v8 has an optimization for storing 31-bit signed numbers.
  // Values which have either 00 or 11 as the high order bits qualify.
  // This function drops the highest order bit in a signed number, maintaining
  // the sign bit.
  function smi(i32) {
    return ((i32 >>> 1) & 0x40000000) | (i32 & 0xbfffffff);
  }

  var defaultValueOf = Object.prototype.valueOf;

  function hash(o) {
    // eslint-disable-next-line eqeqeq
    if (o == null) {
      return hashNullish(o);
    }

    if (typeof o.hashCode === 'function') {
      // Drop any high bits from accidentally long hash codes.
      return smi(o.hashCode(o));
    }

    var v = valueOf(o);

    // eslint-disable-next-line eqeqeq
    if (v == null) {
      return hashNullish(v);
    }

    switch (typeof v) {
      case 'boolean':
        // The hash values for built-in constants are a 1 value for each 5-byte
        // shift region expect for the first, which encodes the value. This
        // reduces the odds of a hash collision for these common values.
        return v ? 0x42108421 : 0x42108420;
      case 'number':
        return hashNumber(v);
      case 'string':
        return v.length > STRING_HASH_CACHE_MIN_STRLEN
          ? cachedHashString(v)
          : hashString(v);
      case 'object':
      case 'function':
        return hashJSObj(v);
      case 'symbol':
        return hashSymbol(v);
      default:
        if (typeof v.toString === 'function') {
          return hashString(v.toString());
        }
        throw new Error('Value type ' + typeof v + ' cannot be hashed.');
    }
  }

  function hashNullish(nullish) {
    return nullish === null ? 0x42108422 : /* undefined */ 0x42108423;
  }

  // Compress arbitrarily large numbers into smi hashes.
  function hashNumber(n) {
    if (n !== n || n === Infinity) {
      return 0;
    }
    var hash = n | 0;
    if (hash !== n) {
      hash ^= n * 0xffffffff;
    }
    while (n > 0xffffffff) {
      n /= 0xffffffff;
      hash ^= n;
    }
    return smi(hash);
  }

  function cachedHashString(string) {
    var hashed = stringHashCache[string];
    if (hashed === undefined) {
      hashed = hashString(string);
      if (STRING_HASH_CACHE_SIZE === STRING_HASH_CACHE_MAX_SIZE) {
        STRING_HASH_CACHE_SIZE = 0;
        stringHashCache = {};
      }
      STRING_HASH_CACHE_SIZE++;
      stringHashCache[string] = hashed;
    }
    return hashed;
  }

  // http://jsperf.com/hashing-strings
  function hashString(string) {
    // This is the hash from JVM
    // The hash code for a string is computed as
    // s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
    // where s[i] is the ith character of the string and n is the length of
    // the string. We "mod" the result to make it between 0 (inclusive) and 2^31
    // (exclusive) by dropping high bits.
    var hashed = 0;
    for (var ii = 0; ii < string.length; ii++) {
      hashed = (31 * hashed + string.charCodeAt(ii)) | 0;
    }
    return smi(hashed);
  }

  function hashSymbol(sym) {
    var hashed = symbolMap[sym];
    if (hashed !== undefined) {
      return hashed;
    }

    hashed = nextHash();

    symbolMap[sym] = hashed;

    return hashed;
  }

  function hashJSObj(obj) {
    var hashed;
    if (usingWeakMap) {
      hashed = weakMap.get(obj);
      if (hashed !== undefined) {
        return hashed;
      }
    }

    hashed = obj[UID_HASH_KEY];
    if (hashed !== undefined) {
      return hashed;
    }

    if (!canDefineProperty) {
      hashed = obj.propertyIsEnumerable && obj.propertyIsEnumerable[UID_HASH_KEY];
      if (hashed !== undefined) {
        return hashed;
      }

      hashed = getIENodeHash(obj);
      if (hashed !== undefined) {
        return hashed;
      }
    }

    hashed = nextHash();

    if (usingWeakMap) {
      weakMap.set(obj, hashed);
    } else if (isExtensible !== undefined && isExtensible(obj) === false) {
      throw new Error('Non-extensible objects are not allowed as keys.');
    } else if (canDefineProperty) {
      Object.defineProperty(obj, UID_HASH_KEY, {
        enumerable: false,
        configurable: false,
        writable: false,
        value: hashed,
      });
    } else if (
      obj.propertyIsEnumerable !== undefined &&
      obj.propertyIsEnumerable === obj.constructor.prototype.propertyIsEnumerable
    ) {
      // Since we can't define a non-enumerable property on the object
      // we'll hijack one of the less-used non-enumerable properties to
      // save our hash on it. Since this is a function it will not show up in
      // `JSON.stringify` which is what we want.
      obj.propertyIsEnumerable = function () {
        return this.constructor.prototype.propertyIsEnumerable.apply(
          this,
          arguments
        );
      };
      obj.propertyIsEnumerable[UID_HASH_KEY] = hashed;
    } else if (obj.nodeType !== undefined) {
      // At this point we couldn't get the IE `uniqueID` to use as a hash
      // and we couldn't use a non-enumerable property to exploit the
      // dontEnum bug so we simply add the `UID_HASH_KEY` on the node
      // itself.
      obj[UID_HASH_KEY] = hashed;
    } else {
      throw new Error('Unable to set a non-enumerable property on object.');
    }

    return hashed;
  }

  // Get references to ES5 object methods.
  var isExtensible = Object.isExtensible;

  // True if Object.defineProperty works as expected. IE8 fails this test.
  var canDefineProperty = (function () {
    try {
      Object.defineProperty({}, '@', {});
      return true;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return false;
    }
  })();

  // IE has a `uniqueID` property on DOM nodes. We can construct the hash from it
  // and avoid memory leaks from the IE cloneNode bug.
  function getIENodeHash(node) {
    if (node && node.nodeType > 0) {
      switch (node.nodeType) {
        case 1: // Element
          return node.uniqueID;
        case 9: // Document
          return node.documentElement && node.documentElement.uniqueID;
      }
    }
  }

  function valueOf(obj) {
    return obj.valueOf !== defaultValueOf && typeof obj.valueOf === 'function'
      ? obj.valueOf(obj)
      : obj;
  }

  function nextHash() {
    var nextHash = ++_objHashUID;
    if (_objHashUID & 0x40000000) {
      _objHashUID = 0;
    }
    return nextHash;
  }

  // If possible, use a WeakMap.
  var usingWeakMap = typeof WeakMap === 'function';
  var weakMap;
  if (usingWeakMap) {
    weakMap = new WeakMap();
  }

  var symbolMap = Object.create(null);

  var _objHashUID = 0;

  var UID_HASH_KEY = '__immutablehash__';
  if (typeof Symbol === 'function') {
    UID_HASH_KEY = Symbol(UID_HASH_KEY);
  }

  var STRING_HASH_CACHE_MIN_STRLEN = 16;
  var STRING_HASH_CACHE_MAX_SIZE = 255;
  var STRING_HASH_CACHE_SIZE = 0;
  var stringHashCache = {};

  var ToKeyedSequence = /*@__PURE__*/(function (KeyedSeq) {
    function ToKeyedSequence(indexed, useKeys) {
      this._iter = indexed;
      this._useKeys = useKeys;
      this.size = indexed.size;
    }

    if ( KeyedSeq ) ToKeyedSequence.__proto__ = KeyedSeq;
    ToKeyedSequence.prototype = Object.create( KeyedSeq && KeyedSeq.prototype );
    ToKeyedSequence.prototype.constructor = ToKeyedSequence;

    ToKeyedSequence.prototype.get = function get (key, notSetValue) {
      return this._iter.get(key, notSetValue);
    };

    ToKeyedSequence.prototype.has = function has (key) {
      return this._iter.has(key);
    };

    ToKeyedSequence.prototype.valueSeq = function valueSeq () {
      return this._iter.valueSeq();
    };

    ToKeyedSequence.prototype.reverse = function reverse () {
      var this$1$1 = this;

      var reversedSequence = reverseFactory(this, true);
      if (!this._useKeys) {
        reversedSequence.valueSeq = function () { return this$1$1._iter.toSeq().reverse(); };
      }
      return reversedSequence;
    };

    ToKeyedSequence.prototype.map = function map (mapper, context) {
      var this$1$1 = this;

      var mappedSequence = mapFactory(this, mapper, context);
      if (!this._useKeys) {
        mappedSequence.valueSeq = function () { return this$1$1._iter.toSeq().map(mapper, context); };
      }
      return mappedSequence;
    };

    ToKeyedSequence.prototype.__iterate = function __iterate (fn, reverse) {
      var this$1$1 = this;

      return this._iter.__iterate(function (v, k) { return fn(v, k, this$1$1); }, reverse);
    };

    ToKeyedSequence.prototype.__iterator = function __iterator (type, reverse) {
      return this._iter.__iterator(type, reverse);
    };

    return ToKeyedSequence;
  }(KeyedSeq));
  ToKeyedSequence.prototype[IS_ORDERED_SYMBOL] = true;

  var ToIndexedSequence = /*@__PURE__*/(function (IndexedSeq) {
    function ToIndexedSequence(iter) {
      this._iter = iter;
      this.size = iter.size;
    }

    if ( IndexedSeq ) ToIndexedSequence.__proto__ = IndexedSeq;
    ToIndexedSequence.prototype = Object.create( IndexedSeq && IndexedSeq.prototype );
    ToIndexedSequence.prototype.constructor = ToIndexedSequence;

    ToIndexedSequence.prototype.includes = function includes (value) {
      return this._iter.includes(value);
    };

    ToIndexedSequence.prototype.__iterate = function __iterate (fn, reverse) {
      var this$1$1 = this;

      var i = 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
      reverse && ensureSize(this);
      return this._iter.__iterate(
        function (v) { return fn(v, reverse ? this$1$1.size - ++i : i++, this$1$1); },
        reverse
      );
    };

    ToIndexedSequence.prototype.__iterator = function __iterator (type, reverse) {
      var this$1$1 = this;

      var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
      var i = 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
      reverse && ensureSize(this);
      return new Iterator(function () {
        var step = iterator.next();
        return step.done
          ? step
          : iteratorValue(
              type,
              reverse ? this$1$1.size - ++i : i++,
              step.value,
              step
            );
      });
    };

    return ToIndexedSequence;
  }(IndexedSeq));

  var ToSetSequence = /*@__PURE__*/(function (SetSeq) {
    function ToSetSequence(iter) {
      this._iter = iter;
      this.size = iter.size;
    }

    if ( SetSeq ) ToSetSequence.__proto__ = SetSeq;
    ToSetSequence.prototype = Object.create( SetSeq && SetSeq.prototype );
    ToSetSequence.prototype.constructor = ToSetSequence;

    ToSetSequence.prototype.has = function has (key) {
      return this._iter.includes(key);
    };

    ToSetSequence.prototype.__iterate = function __iterate (fn, reverse) {
      var this$1$1 = this;

      return this._iter.__iterate(function (v) { return fn(v, v, this$1$1); }, reverse);
    };

    ToSetSequence.prototype.__iterator = function __iterator (type, reverse) {
      var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
      return new Iterator(function () {
        var step = iterator.next();
        return step.done
          ? step
          : iteratorValue(type, step.value, step.value, step);
      });
    };

    return ToSetSequence;
  }(SetSeq));

  var FromEntriesSequence = /*@__PURE__*/(function (KeyedSeq) {
    function FromEntriesSequence(entries) {
      this._iter = entries;
      this.size = entries.size;
    }

    if ( KeyedSeq ) FromEntriesSequence.__proto__ = KeyedSeq;
    FromEntriesSequence.prototype = Object.create( KeyedSeq && KeyedSeq.prototype );
    FromEntriesSequence.prototype.constructor = FromEntriesSequence;

    FromEntriesSequence.prototype.entrySeq = function entrySeq () {
      return this._iter.toSeq();
    };

    FromEntriesSequence.prototype.__iterate = function __iterate (fn, reverse) {
      var this$1$1 = this;

      return this._iter.__iterate(function (entry) {
        // Check if entry exists first so array access doesn't throw for holes
        // in the parent iteration.
        if (entry) {
          validateEntry(entry);
          var indexedCollection = isCollection(entry);
          return fn(
            indexedCollection ? entry.get(1) : entry[1],
            indexedCollection ? entry.get(0) : entry[0],
            this$1$1
          );
        }
      }, reverse);
    };

    FromEntriesSequence.prototype.__iterator = function __iterator (type, reverse) {
      var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
      return new Iterator(function () {
        while (true) {
          var step = iterator.next();
          if (step.done) {
            return step;
          }
          var entry = step.value;
          // Check if entry exists first so array access doesn't throw for holes
          // in the parent iteration.
          if (entry) {
            validateEntry(entry);
            var indexedCollection = isCollection(entry);
            return iteratorValue(
              type,
              indexedCollection ? entry.get(0) : entry[0],
              indexedCollection ? entry.get(1) : entry[1],
              step
            );
          }
        }
      });
    };

    return FromEntriesSequence;
  }(KeyedSeq));

  ToIndexedSequence.prototype.cacheResult =
    ToKeyedSequence.prototype.cacheResult =
    ToSetSequence.prototype.cacheResult =
    FromEntriesSequence.prototype.cacheResult =
      cacheResultThrough;

  function flipFactory(collection) {
    var flipSequence = makeSequence(collection);
    flipSequence._iter = collection;
    flipSequence.size = collection.size;
    flipSequence.flip = function () { return collection; };
    flipSequence.reverse = function () {
      var reversedSequence = collection.reverse.apply(this); // super.reverse()
      reversedSequence.flip = function () { return collection.reverse(); };
      return reversedSequence;
    };
    flipSequence.has = function (key) { return collection.includes(key); };
    flipSequence.includes = function (key) { return collection.has(key); };
    flipSequence.cacheResult = cacheResultThrough;
    flipSequence.__iterateUncached = function (fn, reverse) {
      var this$1$1 = this;

      return collection.__iterate(function (v, k) { return fn(k, v, this$1$1) !== false; }, reverse);
    };
    flipSequence.__iteratorUncached = function (type, reverse) {
      if (type === ITERATE_ENTRIES) {
        var iterator = collection.__iterator(type, reverse);
        return new Iterator(function () {
          var step = iterator.next();
          if (!step.done) {
            var k = step.value[0];
            step.value[0] = step.value[1];
            step.value[1] = k;
          }
          return step;
        });
      }
      return collection.__iterator(
        type === ITERATE_VALUES ? ITERATE_KEYS : ITERATE_VALUES,
        reverse
      );
    };
    return flipSequence;
  }

  function mapFactory(collection, mapper, context) {
    var mappedSequence = makeSequence(collection);
    mappedSequence.size = collection.size;
    mappedSequence.has = function (key) { return collection.has(key); };
    mappedSequence.get = function (key, notSetValue) {
      var v = collection.get(key, NOT_SET);
      return v === NOT_SET
        ? notSetValue
        : mapper.call(context, v, key, collection);
    };
    mappedSequence.__iterateUncached = function (fn, reverse) {
      var this$1$1 = this;

      return collection.__iterate(
        function (v, k, c) { return fn(mapper.call(context, v, k, c), k, this$1$1) !== false; },
        reverse
      );
    };
    mappedSequence.__iteratorUncached = function (type, reverse) {
      var iterator = collection.__iterator(ITERATE_ENTRIES, reverse);
      return new Iterator(function () {
        var step = iterator.next();
        if (step.done) {
          return step;
        }
        var entry = step.value;
        var key = entry[0];
        return iteratorValue(
          type,
          key,
          mapper.call(context, entry[1], key, collection),
          step
        );
      });
    };
    return mappedSequence;
  }

  function reverseFactory(collection, useKeys) {
    var this$1$1 = this;

    var reversedSequence = makeSequence(collection);
    reversedSequence._iter = collection;
    reversedSequence.size = collection.size;
    reversedSequence.reverse = function () { return collection; };
    if (collection.flip) {
      reversedSequence.flip = function () {
        var flipSequence = flipFactory(collection);
        flipSequence.reverse = function () { return collection.flip(); };
        return flipSequence;
      };
    }
    reversedSequence.get = function (key, notSetValue) { return collection.get(useKeys ? key : -1 - key, notSetValue); };
    reversedSequence.has = function (key) { return collection.has(useKeys ? key : -1 - key); };
    reversedSequence.includes = function (value) { return collection.includes(value); };
    reversedSequence.cacheResult = cacheResultThrough;
    reversedSequence.__iterate = function (fn, reverse) {
      var this$1$1 = this;

      var i = 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
      reverse && ensureSize(collection);
      return collection.__iterate(
        function (v, k) { return fn(v, useKeys ? k : reverse ? this$1$1.size - ++i : i++, this$1$1); },
        !reverse
      );
    };
    reversedSequence.__iterator = function (type, reverse) {
      var i = 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
      reverse && ensureSize(collection);
      var iterator = collection.__iterator(ITERATE_ENTRIES, !reverse);
      return new Iterator(function () {
        var step = iterator.next();
        if (step.done) {
          return step;
        }
        var entry = step.value;
        return iteratorValue(
          type,
          useKeys ? entry[0] : reverse ? this$1$1.size - ++i : i++,
          entry[1],
          step
        );
      });
    };
    return reversedSequence;
  }

  function filterFactory(collection, predicate, context, useKeys) {
    var filterSequence = makeSequence(collection);
    if (useKeys) {
      filterSequence.has = function (key) {
        var v = collection.get(key, NOT_SET);
        return v !== NOT_SET && !!predicate.call(context, v, key, collection);
      };
      filterSequence.get = function (key, notSetValue) {
        var v = collection.get(key, NOT_SET);
        return v !== NOT_SET && predicate.call(context, v, key, collection)
          ? v
          : notSetValue;
      };
    }
    filterSequence.__iterateUncached = function (fn, reverse) {
      var this$1$1 = this;

      var iterations = 0;
      collection.__iterate(function (v, k, c) {
        if (predicate.call(context, v, k, c)) {
          iterations++;
          return fn(v, useKeys ? k : iterations - 1, this$1$1);
        }
      }, reverse);
      return iterations;
    };
    filterSequence.__iteratorUncached = function (type, reverse) {
      var iterator = collection.__iterator(ITERATE_ENTRIES, reverse);
      var iterations = 0;
      return new Iterator(function () {
        while (true) {
          var step = iterator.next();
          if (step.done) {
            return step;
          }
          var entry = step.value;
          var key = entry[0];
          var value = entry[1];
          if (predicate.call(context, value, key, collection)) {
            return iteratorValue(type, useKeys ? key : iterations++, value, step);
          }
        }
      });
    };
    return filterSequence;
  }

  function countByFactory(collection, grouper, context) {
    var groups = Map$1().asMutable();
    collection.__iterate(function (v, k) {
      groups.update(grouper.call(context, v, k, collection), 0, function (a) { return a + 1; });
    });
    return groups.asImmutable();
  }

  function groupByFactory(collection, grouper, context) {
    var isKeyedIter = isKeyed(collection);
    var groups = (isOrdered(collection) ? OrderedMap() : Map$1()).asMutable();
    collection.__iterate(function (v, k) {
      groups.update(
        grouper.call(context, v, k, collection),
        function (a) { return ((a = a || []), a.push(isKeyedIter ? [k, v] : v), a); }
      );
    });
    var coerce = collectionClass(collection);
    return groups.map(function (arr) { return reify(collection, coerce(arr)); }).asImmutable();
  }

  function partitionFactory(collection, predicate, context) {
    var isKeyedIter = isKeyed(collection);
    var groups = [[], []];
    collection.__iterate(function (v, k) {
      groups[predicate.call(context, v, k, collection) ? 1 : 0].push(
        isKeyedIter ? [k, v] : v
      );
    });
    var coerce = collectionClass(collection);
    return groups.map(function (arr) { return reify(collection, coerce(arr)); });
  }

  function sliceFactory(collection, begin, end, useKeys) {
    var originalSize = collection.size;

    if (wholeSlice(begin, end, originalSize)) {
      return collection;
    }

    // begin or end can not be resolved if they were provided as negative numbers and
    // this collection's size is unknown. In that case, cache first so there is
    // a known size and these do not resolve to NaN.
    if (typeof originalSize === 'undefined' && (begin < 0 || end < 0)) {
      return sliceFactory(collection.toSeq().cacheResult(), begin, end, useKeys);
    }

    var resolvedBegin = resolveBegin(begin, originalSize);
    var resolvedEnd = resolveEnd(end, originalSize);

    // Note: resolvedEnd is undefined when the original sequence's length is
    // unknown and this slice did not supply an end and should contain all
    // elements after resolvedBegin.
    // In that case, resolvedSize will be NaN and sliceSize will remain undefined.
    var resolvedSize = resolvedEnd - resolvedBegin;
    var sliceSize;
    if (resolvedSize === resolvedSize) {
      sliceSize = resolvedSize < 0 ? 0 : resolvedSize;
    }

    var sliceSeq = makeSequence(collection);

    // If collection.size is undefined, the size of the realized sliceSeq is
    // unknown at this point unless the number of items to slice is 0
    sliceSeq.size =
      sliceSize === 0 ? sliceSize : (collection.size && sliceSize) || undefined;

    if (!useKeys && isSeq(collection) && sliceSize >= 0) {
      sliceSeq.get = function (index, notSetValue) {
        index = wrapIndex(this, index);
        return index >= 0 && index < sliceSize
          ? collection.get(index + resolvedBegin, notSetValue)
          : notSetValue;
      };
    }

    sliceSeq.__iterateUncached = function (fn, reverse) {
      var this$1$1 = this;

      if (sliceSize === 0) {
        return 0;
      }
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      var skipped = 0;
      var isSkipping = true;
      var iterations = 0;
      collection.__iterate(function (v, k) {
        if (!(isSkipping && (isSkipping = skipped++ < resolvedBegin))) {
          iterations++;
          return (
            fn(v, useKeys ? k : iterations - 1, this$1$1) !== false &&
            iterations !== sliceSize
          );
        }
      });
      return iterations;
    };

    sliceSeq.__iteratorUncached = function (type, reverse) {
      if (sliceSize !== 0 && reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }
      // Don't bother instantiating parent iterator if taking 0.
      if (sliceSize === 0) {
        return new Iterator(iteratorDone);
      }
      var iterator = collection.__iterator(type, reverse);
      var skipped = 0;
      var iterations = 0;
      return new Iterator(function () {
        while (skipped++ < resolvedBegin) {
          iterator.next();
        }
        if (++iterations > sliceSize) {
          return iteratorDone();
        }
        var step = iterator.next();
        if (useKeys || type === ITERATE_VALUES || step.done) {
          return step;
        }
        if (type === ITERATE_KEYS) {
          return iteratorValue(type, iterations - 1, undefined, step);
        }
        return iteratorValue(type, iterations - 1, step.value[1], step);
      });
    };

    return sliceSeq;
  }

  function takeWhileFactory(collection, predicate, context) {
    var takeSequence = makeSequence(collection);
    takeSequence.__iterateUncached = function (fn, reverse) {
      var this$1$1 = this;

      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      var iterations = 0;
      collection.__iterate(
        function (v, k, c) { return predicate.call(context, v, k, c) && ++iterations && fn(v, k, this$1$1); }
      );
      return iterations;
    };
    takeSequence.__iteratorUncached = function (type, reverse) {
      var this$1$1 = this;

      if (reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }
      var iterator = collection.__iterator(ITERATE_ENTRIES, reverse);
      var iterating = true;
      return new Iterator(function () {
        if (!iterating) {
          return iteratorDone();
        }
        var step = iterator.next();
        if (step.done) {
          return step;
        }
        var entry = step.value;
        var k = entry[0];
        var v = entry[1];
        if (!predicate.call(context, v, k, this$1$1)) {
          iterating = false;
          return iteratorDone();
        }
        return type === ITERATE_ENTRIES ? step : iteratorValue(type, k, v, step);
      });
    };
    return takeSequence;
  }

  function skipWhileFactory(collection, predicate, context, useKeys) {
    var skipSequence = makeSequence(collection);
    skipSequence.__iterateUncached = function (fn, reverse) {
      var this$1$1 = this;

      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      var isSkipping = true;
      var iterations = 0;
      collection.__iterate(function (v, k, c) {
        if (!(isSkipping && (isSkipping = predicate.call(context, v, k, c)))) {
          iterations++;
          return fn(v, useKeys ? k : iterations - 1, this$1$1);
        }
      });
      return iterations;
    };
    skipSequence.__iteratorUncached = function (type, reverse) {
      var this$1$1 = this;

      if (reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }
      var iterator = collection.__iterator(ITERATE_ENTRIES, reverse);
      var skipping = true;
      var iterations = 0;
      return new Iterator(function () {
        var step;
        var k;
        var v;
        do {
          step = iterator.next();
          if (step.done) {
            if (useKeys || type === ITERATE_VALUES) {
              return step;
            }
            if (type === ITERATE_KEYS) {
              return iteratorValue(type, iterations++, undefined, step);
            }
            return iteratorValue(type, iterations++, step.value[1], step);
          }
          var entry = step.value;
          k = entry[0];
          v = entry[1];
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
          skipping && (skipping = predicate.call(context, v, k, this$1$1));
        } while (skipping);
        return type === ITERATE_ENTRIES ? step : iteratorValue(type, k, v, step);
      });
    };
    return skipSequence;
  }

  var ConcatSeq = /*@__PURE__*/(function (Seq) {
    function ConcatSeq(iterables) {
      this._wrappedIterables = iterables.flatMap(function (iterable) {
        if (iterable._wrappedIterables) {
          return iterable._wrappedIterables;
        }
        return [iterable];
      });
      this.size = this._wrappedIterables.reduce(function (sum, iterable) {
        if (sum !== undefined) {
          var size = iterable.size;
          if (size !== undefined) {
            return sum + size;
          }
        }
      }, 0);
      this[IS_KEYED_SYMBOL] = this._wrappedIterables[0][IS_KEYED_SYMBOL];
      this[IS_INDEXED_SYMBOL] = this._wrappedIterables[0][IS_INDEXED_SYMBOL];
      this[IS_ORDERED_SYMBOL] = this._wrappedIterables[0][IS_ORDERED_SYMBOL];
    }

    if ( Seq ) ConcatSeq.__proto__ = Seq;
    ConcatSeq.prototype = Object.create( Seq && Seq.prototype );
    ConcatSeq.prototype.constructor = ConcatSeq;

    ConcatSeq.prototype.__iterateUncached = function __iterateUncached (fn, reverse) {
      if (this._wrappedIterables.length === 0) {
        return;
      }

      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }

      var iterableIndex = 0;
      var useKeys = isKeyed(this);
      var iteratorType = useKeys ? ITERATE_ENTRIES : ITERATE_VALUES;
      var currentIterator = this._wrappedIterables[iterableIndex].__iterator(
        iteratorType,
        reverse
      );

      var keepGoing = true;
      var index = 0;
      while (keepGoing) {
        var next = currentIterator.next();
        while (next.done) {
          iterableIndex++;
          if (iterableIndex === this._wrappedIterables.length) {
            return index;
          }
          currentIterator = this._wrappedIterables[iterableIndex].__iterator(
            iteratorType,
            reverse
          );
          next = currentIterator.next();
        }
        var fnResult = useKeys
          ? fn(next.value[1], next.value[0], this)
          : fn(next.value, index, this);
        keepGoing = fnResult !== false;
        index++;
      }
      return index;
    };

    ConcatSeq.prototype.__iteratorUncached = function __iteratorUncached (type, reverse) {
      var this$1$1 = this;

      if (this._wrappedIterables.length === 0) {
        return new Iterator(iteratorDone);
      }

      if (reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }

      var iterableIndex = 0;
      var currentIterator = this._wrappedIterables[iterableIndex].__iterator(
        type,
        reverse
      );
      return new Iterator(function () {
        var next = currentIterator.next();
        while (next.done) {
          iterableIndex++;
          if (iterableIndex === this$1$1._wrappedIterables.length) {
            return next;
          }
          currentIterator = this$1$1._wrappedIterables[iterableIndex].__iterator(
            type,
            reverse
          );
          next = currentIterator.next();
        }
        return next;
      });
    };

    return ConcatSeq;
  }(Seq));

  function concatFactory(collection, values) {
    var isKeyedCollection = isKeyed(collection);
    var iters = [collection]
      .concat(values)
      .map(function (v) {
        if (!isCollection(v)) {
          v = isKeyedCollection
            ? keyedSeqFromValue(v)
            : indexedSeqFromValue(Array.isArray(v) ? v : [v]);
        } else if (isKeyedCollection) {
          v = KeyedCollection(v);
        }
        return v;
      })
      .filter(function (v) { return v.size !== 0; });

    if (iters.length === 0) {
      return collection;
    }

    if (iters.length === 1) {
      var singleton = iters[0];
      if (
        singleton === collection ||
        (isKeyedCollection && isKeyed(singleton)) ||
        (isIndexed(collection) && isIndexed(singleton))
      ) {
        return singleton;
      }
    }

    return new ConcatSeq(iters);
  }

  function flattenFactory(collection, depth, useKeys) {
    var flatSequence = makeSequence(collection);
    flatSequence.__iterateUncached = function (fn, reverse) {
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      var iterations = 0;
      var stopped = false;
      function flatDeep(iter, currentDepth) {
        iter.__iterate(function (v, k) {
          if ((!depth || currentDepth < depth) && isCollection(v)) {
            flatDeep(v, currentDepth + 1);
          } else {
            iterations++;
            if (fn(v, useKeys ? k : iterations - 1, flatSequence) === false) {
              stopped = true;
            }
          }
          return !stopped;
        }, reverse);
      }
      flatDeep(collection, 0);
      return iterations;
    };
    flatSequence.__iteratorUncached = function (type, reverse) {
      if (reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }
      var iterator = collection.__iterator(type, reverse);
      var stack = [];
      var iterations = 0;
      return new Iterator(function () {
        while (iterator) {
          var step = iterator.next();
          if (step.done !== false) {
            iterator = stack.pop();
            continue;
          }
          var v = step.value;
          if (type === ITERATE_ENTRIES) {
            v = v[1];
          }
          if ((!depth || stack.length < depth) && isCollection(v)) {
            stack.push(iterator);
            iterator = v.__iterator(type, reverse);
          } else {
            return useKeys ? step : iteratorValue(type, iterations++, v, step);
          }
        }
        return iteratorDone();
      });
    };
    return flatSequence;
  }

  function flatMapFactory(collection, mapper, context) {
    var coerce = collectionClass(collection);
    return collection
      .toSeq()
      .map(function (v, k) { return coerce(mapper.call(context, v, k, collection)); })
      .flatten(true);
  }

  function interposeFactory(collection, separator) {
    var interposedSequence = makeSequence(collection);
    interposedSequence.size = collection.size && collection.size * 2 - 1;
    interposedSequence.__iterateUncached = function (fn, reverse) {
      var this$1$1 = this;

      var iterations = 0;
      collection.__iterate(
        function (v) { return (!iterations || fn(separator, iterations++, this$1$1) !== false) &&
          fn(v, iterations++, this$1$1) !== false; },
        reverse
      );
      return iterations;
    };
    interposedSequence.__iteratorUncached = function (type, reverse) {
      var iterator = collection.__iterator(ITERATE_VALUES, reverse);
      var iterations = 0;
      var step;
      return new Iterator(function () {
        if (!step || iterations % 2) {
          step = iterator.next();
          if (step.done) {
            return step;
          }
        }
        return iterations % 2
          ? iteratorValue(type, iterations++, separator)
          : iteratorValue(type, iterations++, step.value, step);
      });
    };
    return interposedSequence;
  }

  function sortFactory(collection, comparator, mapper) {
    if (!comparator) {
      comparator = defaultComparator;
    }
    var isKeyedCollection = isKeyed(collection);
    var index = 0;
    var entries = collection
      .toSeq()
      .map(function (v, k) { return [k, v, index++, mapper ? mapper(v, k, collection) : v]; })
      .valueSeq()
      .toArray();
    entries
      .sort(function (a, b) { return comparator(a[3], b[3]) || a[2] - b[2]; })
      .forEach(
        isKeyedCollection
          ? function (v, i) {
              entries[i].length = 2;
            }
          : function (v, i) {
              entries[i] = v[1];
            }
      );
    return isKeyedCollection
      ? KeyedSeq(entries)
      : isIndexed(collection)
        ? IndexedSeq(entries)
        : SetSeq(entries);
  }

  function maxFactory(collection, comparator, mapper) {
    if (!comparator) {
      comparator = defaultComparator;
    }
    if (mapper) {
      var entry = collection
        .toSeq()
        .map(function (v, k) { return [v, mapper(v, k, collection)]; })
        .reduce(function (a, b) { return (maxCompare(comparator, a[1], b[1]) ? b : a); });
      return entry && entry[0];
    }
    return collection.reduce(function (a, b) { return (maxCompare(comparator, a, b) ? b : a); });
  }

  function maxCompare(comparator, a, b) {
    var comp = comparator(b, a);
    // b is considered the new max if the comparator declares them equal, but
    // they are not equal and b is in fact a nullish value.
    return (
      (comp === 0 && b !== a && (b === undefined || b === null || b !== b)) ||
      comp > 0
    );
  }

  function zipWithFactory(keyIter, zipper, iters, zipAll) {
    var zipSequence = makeSequence(keyIter);
    var sizes = new ArraySeq(iters).map(function (i) { return i.size; });
    zipSequence.size = zipAll ? sizes.max() : sizes.min();
    // Note: this a generic base implementation of __iterate in terms of
    // __iterator which may be more generically useful in the future.
    zipSequence.__iterate = function (fn, reverse) {
      /* generic:
      var iterator = this.__iterator(ITERATE_ENTRIES, reverse);
      var step;
      var iterations = 0;
      while (!(step = iterator.next()).done) {
        iterations++;
        if (fn(step.value[1], step.value[0], this) === false) {
          break;
        }
      }
      return iterations;
      */
      // indexed:
      var iterator = this.__iterator(ITERATE_VALUES, reverse);
      var step;
      var iterations = 0;
      while (!(step = iterator.next()).done) {
        if (fn(step.value, iterations++, this) === false) {
          break;
        }
      }
      return iterations;
    };
    zipSequence.__iteratorUncached = function (type, reverse) {
      var iterators = iters.map(
        function (i) { return ((i = Collection(i)), getIterator(reverse ? i.reverse() : i)); }
      );
      var iterations = 0;
      var isDone = false;
      return new Iterator(function () {
        var steps;
        if (!isDone) {
          steps = iterators.map(function (i) { return i.next(); });
          isDone = zipAll
            ? steps.every(function (s) { return s.done; })
            : steps.some(function (s) { return s.done; });
        }
        if (isDone) {
          return iteratorDone();
        }
        return iteratorValue(
          type,
          iterations++,
          zipper.apply(
            null,
            steps.map(function (s) { return s.value; })
          )
        );
      });
    };
    return zipSequence;
  }

  // #pragma Helper Functions

  function reify(iter, seq) {
    return iter === seq ? iter : isSeq(iter) ? seq : iter.constructor(seq);
  }

  function validateEntry(entry) {
    if (entry !== Object(entry)) {
      throw new TypeError('Expected [K, V] tuple: ' + entry);
    }
  }

  function collectionClass(collection) {
    return isKeyed(collection)
      ? KeyedCollection
      : isIndexed(collection)
        ? IndexedCollection
        : SetCollection;
  }

  function makeSequence(collection) {
    return Object.create(
      (isKeyed(collection)
        ? KeyedSeq
        : isIndexed(collection)
          ? IndexedSeq
          : SetSeq
      ).prototype
    );
  }

  function cacheResultThrough() {
    if (this._iter.cacheResult) {
      this._iter.cacheResult();
      this.size = this._iter.size;
      return this;
    }
    return Seq.prototype.cacheResult.call(this);
  }

  function defaultComparator(a, b) {
    if (a === undefined && b === undefined) {
      return 0;
    }

    if (a === undefined) {
      return 1;
    }

    if (b === undefined) {
      return -1;
    }

    return a > b ? 1 : a < b ? -1 : 0;
  }

  // http://jsperf.com/copy-array-inline
  function arrCopy(arr, offset) {
      offset = offset || 0;
      var len = Math.max(0, arr.length - offset);
      var newArr = new Array(len);
      for (var ii = 0; ii < len; ii++) {
          // @ts-expect-error We may want to guard for undefined values with `if (arr[ii + offset] !== undefined`, but ths should not happen by design
          newArr[ii] = arr[ii + offset];
      }
      return newArr;
  }

  function invariant(condition, error) {
      if (!condition)
          { throw new Error(error); }
  }

  function assertNotInfinite(size) {
      invariant(size !== Infinity, 'Cannot perform this action with an infinite size.');
  }

  function coerceKeyPath(keyPath) {
      if (isArrayLike(keyPath) && typeof keyPath !== 'string') {
          return keyPath;
      }
      if (isOrdered(keyPath)) {
          return keyPath.toArray();
      }
      throw new TypeError('Invalid keyPath: expected Ordered Collection or Array: ' + keyPath);
  }

  var toString = Object.prototype.toString;
  function isPlainObject(value) {
      // The base prototype's toString deals with Argument objects and native namespaces like Math
      if (!value ||
          typeof value !== 'object' ||
          toString.call(value) !== '[object Object]') {
          return false;
      }
      var proto = Object.getPrototypeOf(value);
      if (proto === null) {
          return true;
      }
      // Iteratively going up the prototype chain is needed for cross-realm environments (differing contexts, iframes, etc)
      var parentProto = proto;
      var nextProto = Object.getPrototypeOf(proto);
      while (nextProto !== null) {
          parentProto = nextProto;
          nextProto = Object.getPrototypeOf(parentProto);
      }
      return parentProto === proto;
  }

  /**
   * Returns true if the value is a potentially-persistent data structure, either
   * provided by Immutable.js or a plain Array or Object.
   */
  function isDataStructure(value) {
      return (typeof value === 'object' &&
          (isImmutable(value) || Array.isArray(value) || isPlainObject(value)));
  }

  /**
   * Converts a value to a string, adding quotes if a string was provided.
   */
  function quoteString(value) {
      try {
          return typeof value === 'string' ? JSON.stringify(value) : String(value);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
      }
      catch (_ignoreError) {
          return JSON.stringify(value);
      }
  }

  /**
   * Returns true if the key is defined in the provided collection.
   *
   * A functional alternative to `collection.has(key)` which will also work with
   * plain Objects and Arrays as an alternative for
   * `collection.hasOwnProperty(key)`.
   */
  function has(collection, key) {
      return isImmutable(collection)
          ? // @ts-expect-error key might be a number or symbol, which is not handled be Record key type
              collection.has(key)
          : // @ts-expect-error key might be anything else than PropertyKey, and will return false in that case but runtime is OK
              isDataStructure(collection) && hasOwnProperty.call(collection, key);
  }

  function get(collection, key, notSetValue) {
      return isImmutable(collection)
          ? collection.get(key, notSetValue)
          : !has(collection, key)
              ? notSetValue
              : // @ts-expect-error weird "get" here,
                  typeof collection.get === 'function'
                      ? // @ts-expect-error weird "get" here,
                          collection.get(key)
                      : // @ts-expect-error key is unknown here,
                          collection[key];
  }

  function shallowCopy(from) {
      if (Array.isArray(from)) {
          return arrCopy(from);
      }
      var to = {};
      for (var key in from) {
          if (hasOwnProperty.call(from, key)) {
              to[key] = from[key];
          }
      }
      return to;
  }

  function remove(collection, key) {
      if (!isDataStructure(collection)) {
          throw new TypeError('Cannot update non-data-structure value: ' + collection);
      }
      if (isImmutable(collection)) {
          // @ts-expect-error weird "remove" here,
          if (!collection.remove) {
              throw new TypeError('Cannot update immutable value without .remove() method: ' + collection);
          }
          // @ts-expect-error weird "remove" here,
          return collection.remove(key);
      }
      // @ts-expect-error assert that key is a string, a number or a symbol here
      if (!hasOwnProperty.call(collection, key)) {
          return collection;
      }
      var collectionCopy = shallowCopy(collection);
      if (Array.isArray(collectionCopy)) {
          // @ts-expect-error assert that key is a number here
          collectionCopy.splice(key, 1);
      }
      else {
          // @ts-expect-error assert that key is a string, a number or a symbol here
          delete collectionCopy[key];
      }
      return collectionCopy;
  }

  function set(collection, key, value) {
      if (!isDataStructure(collection)) {
          throw new TypeError('Cannot update non-data-structure value: ' + collection);
      }
      if (isImmutable(collection)) {
          // @ts-expect-error weird "set" here,
          if (!collection.set) {
              throw new TypeError('Cannot update immutable value without .set() method: ' + collection);
          }
          // @ts-expect-error weird "set" here,
          return collection.set(key, value);
      }
      // @ts-expect-error mix of key and string here. Probably need a more fine type here
      if (hasOwnProperty.call(collection, key) && value === collection[key]) {
          return collection;
      }
      var collectionCopy = shallowCopy(collection);
      // @ts-expect-error mix of key and string here. Probably need a more fine type here
      collectionCopy[key] = value;
      return collectionCopy;
  }

  function updateIn$1(collection, keyPath, notSetValue, updater) {
      if (!updater) {
          // handle the fact that `notSetValue` is optional here, in that case `updater` is the updater function
          // @ts-expect-error updater is a function here
          updater = notSetValue;
          notSetValue = undefined;
      }
      var updatedValue = updateInDeeply(isImmutable(collection), 
      // @ts-expect-error type issues with Record and mixed types
      collection, coerceKeyPath(keyPath), 0, notSetValue, updater);
      // @ts-expect-error mixed return type
      return updatedValue === NOT_SET ? notSetValue : updatedValue;
  }
  function updateInDeeply(inImmutable, existing, keyPath, i, notSetValue, updater) {
      var wasNotSet = existing === NOT_SET;
      if (i === keyPath.length) {
          var existingValue = wasNotSet ? notSetValue : existing;
          // @ts-expect-error mixed type with optional value
          var newValue = updater(existingValue);
          // @ts-expect-error mixed type
          return newValue === existingValue ? existing : newValue;
      }
      if (!wasNotSet && !isDataStructure(existing)) {
          throw new TypeError('Cannot update within non-data-structure value in path [' +
              Array.from(keyPath).slice(0, i).map(quoteString) +
              ']: ' +
              existing);
      }
      var key = keyPath[i];
      var nextExisting = wasNotSet ? NOT_SET : get(existing, key, NOT_SET);
      var nextUpdated = updateInDeeply(nextExisting === NOT_SET ? inImmutable : isImmutable(nextExisting), 
      // @ts-expect-error mixed type
      nextExisting, keyPath, i + 1, notSetValue, updater);
      return nextUpdated === nextExisting
          ? existing
          : nextUpdated === NOT_SET
              ? remove(existing, key)
              : set(wasNotSet ? (inImmutable ? emptyMap() : {}) : existing, key, nextUpdated);
  }

  /**
   * Returns a copy of the collection with the value at the key path set to the
   * provided value.
   *
   * A functional alternative to `collection.setIn(keypath)` which will also
   * work with plain Objects and Arrays.
   */
  function setIn$1(collection, keyPath, value) {
      return updateIn$1(collection, keyPath, NOT_SET, function () { return value; });
  }

  function setIn(keyPath, v) {
    return setIn$1(this, keyPath, v);
  }

  /**
   * Returns a copy of the collection with the value at the key path removed.
   *
   * A functional alternative to `collection.removeIn(keypath)` which will also
   * work with plain Objects and Arrays.
   */
  function removeIn(collection, keyPath) {
      return updateIn$1(collection, keyPath, function () { return NOT_SET; });
  }

  function deleteIn(keyPath) {
    return removeIn(this, keyPath);
  }

  function update$1(collection, key, notSetValue, updater) {
      return updateIn$1(
      // @ts-expect-error Index signature for type string is missing in type V[]
      collection, [key], notSetValue, updater);
  }

  function update(key, notSetValue, updater) {
    return arguments.length === 1
      ? key(this)
      : update$1(this, key, notSetValue, updater);
  }

  function updateIn(keyPath, notSetValue, updater) {
    return updateIn$1(this, keyPath, notSetValue, updater);
  }

  function merge$1() {
    var iters = [], len = arguments.length;
    while ( len-- ) iters[ len ] = arguments[ len ];

    return mergeIntoKeyedWith(this, iters);
  }

  function mergeWith$1(merger) {
    var iters = [], len = arguments.length - 1;
    while ( len-- > 0 ) iters[ len ] = arguments[ len + 1 ];

    if (typeof merger !== 'function') {
      throw new TypeError('Invalid merger function: ' + merger);
    }
    return mergeIntoKeyedWith(this, iters, merger);
  }

  function mergeIntoKeyedWith(collection, collections, merger) {
    var iters = [];
    for (var ii = 0; ii < collections.length; ii++) {
      var collection$1 = KeyedCollection(collections[ii]);
      if (collection$1.size !== 0) {
        iters.push(collection$1);
      }
    }
    if (iters.length === 0) {
      return collection;
    }
    if (
      collection.toSeq().size === 0 &&
      !collection.__ownerID &&
      iters.length === 1
    ) {
      return isRecord(collection)
        ? collection // Record is empty and will not be updated: return the same instance
        : collection.constructor(iters[0]);
    }
    return collection.withMutations(function (collection) {
      var mergeIntoCollection = merger
        ? function (value, key) {
            update$1(collection, key, NOT_SET, function (oldVal) { return oldVal === NOT_SET ? value : merger(oldVal, value, key); }
            );
          }
        : function (value, key) {
            collection.set(key, value);
          };
      for (var ii = 0; ii < iters.length; ii++) {
        iters[ii].forEach(mergeIntoCollection);
      }
    });
  }

  function mergeDeepWithSources(collection, sources, merger) {
    return mergeWithSources(collection, sources, deepMergerWith(merger));
  }

  function mergeWithSources(collection, sources, merger) {
    if (!isDataStructure(collection)) {
      throw new TypeError(
        'Cannot merge into non-data-structure value: ' + collection
      );
    }
    if (isImmutable(collection)) {
      return typeof merger === 'function' && collection.mergeWith
        ? collection.mergeWith.apply(collection, [ merger ].concat( sources ))
        : collection.merge
          ? collection.merge.apply(collection, sources)
          : collection.concat.apply(collection, sources);
    }
    var isArray = Array.isArray(collection);
    var merged = collection;
    var Collection = isArray ? IndexedCollection : KeyedCollection;
    var mergeItem = isArray
      ? function (value) {
          // Copy on write
          if (merged === collection) {
            merged = shallowCopy(merged);
          }
          merged.push(value);
        }
      : function (value, key) {
          var hasVal = hasOwnProperty.call(merged, key);
          var nextVal =
            hasVal && merger ? merger(merged[key], value, key) : value;
          if (!hasVal || nextVal !== merged[key]) {
            // Copy on write
            if (merged === collection) {
              merged = shallowCopy(merged);
            }
            merged[key] = nextVal;
          }
        };
    for (var i = 0; i < sources.length; i++) {
      Collection(sources[i]).forEach(mergeItem);
    }
    return merged;
  }

  function deepMergerWith(merger) {
    function deepMerger(oldValue, newValue, key) {
      return isDataStructure(oldValue) &&
        isDataStructure(newValue) &&
        areMergeable(oldValue, newValue)
        ? mergeWithSources(oldValue, [newValue], deepMerger)
        : merger
          ? merger(oldValue, newValue, key)
          : newValue;
    }
    return deepMerger;
  }

  /**
   * It's unclear what the desired behavior is for merging two collections that
   * fall into separate categories between keyed, indexed, or set-like, so we only
   * consider them mergeable if they fall into the same category.
   */
  function areMergeable(oldDataStructure, newDataStructure) {
    var oldSeq = Seq(oldDataStructure);
    var newSeq = Seq(newDataStructure);
    // This logic assumes that a sequence can only fall into one of the three
    // categories mentioned above (since there's no `isSetLike()` method).
    return (
      isIndexed(oldSeq) === isIndexed(newSeq) &&
      isKeyed(oldSeq) === isKeyed(newSeq)
    );
  }

  function mergeDeep() {
    var iters = [], len = arguments.length;
    while ( len-- ) iters[ len ] = arguments[ len ];

    return mergeDeepWithSources(this, iters);
  }

  function mergeDeepWith(merger) {
    var iters = [], len = arguments.length - 1;
    while ( len-- > 0 ) iters[ len ] = arguments[ len + 1 ];

    return mergeDeepWithSources(this, iters, merger);
  }

  function mergeIn(keyPath) {
    var iters = [], len = arguments.length - 1;
    while ( len-- > 0 ) iters[ len ] = arguments[ len + 1 ];

    return updateIn$1(this, keyPath, emptyMap(), function (m) { return mergeWithSources(m, iters); });
  }

  function mergeDeepIn(keyPath) {
    var iters = [], len = arguments.length - 1;
    while ( len-- > 0 ) iters[ len ] = arguments[ len + 1 ];

    return updateIn$1(this, keyPath, emptyMap(), function (m) { return mergeDeepWithSources(m, iters); }
    );
  }

  function withMutations(fn) {
    var mutable = this.asMutable();
    fn(mutable);
    return mutable.wasAltered() ? mutable.__ensureOwner(this.__ownerID) : this;
  }

  function asMutable() {
    return this.__ownerID ? this : this.__ensureOwner(new OwnerID());
  }

  function asImmutable() {
    return this.__ensureOwner();
  }

  function wasAltered() {
    return this.__altered;
  }

  var Map$1 = /*@__PURE__*/(function (KeyedCollection) {
    function Map(value) {
      // eslint-disable-next-line no-constructor-return
      return value === undefined || value === null
        ? emptyMap()
        : isMap(value) && !isOrdered(value)
          ? value
          : emptyMap().withMutations(function (map) {
              var iter = KeyedCollection(value);
              assertNotInfinite(iter.size);
              iter.forEach(function (v, k) { return map.set(k, v); });
            });
    }

    if ( KeyedCollection ) Map.__proto__ = KeyedCollection;
    Map.prototype = Object.create( KeyedCollection && KeyedCollection.prototype );
    Map.prototype.constructor = Map;

    Map.prototype.toString = function toString () {
      return this.__toString('Map {', '}');
    };

    // @pragma Access

    Map.prototype.get = function get (k, notSetValue) {
      return this._root
        ? this._root.get(0, undefined, k, notSetValue)
        : notSetValue;
    };

    // @pragma Modification

    Map.prototype.set = function set (k, v) {
      return updateMap(this, k, v);
    };

    Map.prototype.remove = function remove (k) {
      return updateMap(this, k, NOT_SET);
    };

    Map.prototype.deleteAll = function deleteAll (keys) {
      var collection = Collection(keys);

      if (collection.size === 0) {
        return this;
      }

      return this.withMutations(function (map) {
        collection.forEach(function (key) { return map.remove(key); });
      });
    };

    Map.prototype.clear = function clear () {
      if (this.size === 0) {
        return this;
      }
      if (this.__ownerID) {
        this.size = 0;
        this._root = null;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return emptyMap();
    };

    // @pragma Composition

    Map.prototype.sort = function sort (comparator) {
      // Late binding
      return OrderedMap(sortFactory(this, comparator));
    };

    Map.prototype.sortBy = function sortBy (mapper, comparator) {
      // Late binding
      return OrderedMap(sortFactory(this, comparator, mapper));
    };

    Map.prototype.map = function map (mapper, context) {
      var this$1$1 = this;

      return this.withMutations(function (map) {
        map.forEach(function (value, key) {
          map.set(key, mapper.call(context, value, key, this$1$1));
        });
      });
    };

    // @pragma Mutability

    Map.prototype.__iterator = function __iterator (type, reverse) {
      return new MapIterator(this, type, reverse);
    };

    Map.prototype.__iterate = function __iterate (fn, reverse) {
      var this$1$1 = this;

      var iterations = 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
      this._root &&
        this._root.iterate(function (entry) {
          iterations++;
          return fn(entry[1], entry[0], this$1$1);
        }, reverse);
      return iterations;
    };

    Map.prototype.__ensureOwner = function __ensureOwner (ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      if (!ownerID) {
        if (this.size === 0) {
          return emptyMap();
        }
        this.__ownerID = ownerID;
        this.__altered = false;
        return this;
      }
      return makeMap(this.size, this._root, ownerID, this.__hash);
    };

    return Map;
  }(KeyedCollection));

  Map$1.isMap = isMap;

  var MapPrototype = Map$1.prototype;
  MapPrototype[IS_MAP_SYMBOL] = true;
  MapPrototype[DELETE] = MapPrototype.remove;
  MapPrototype.removeAll = MapPrototype.deleteAll;
  MapPrototype.setIn = setIn;
  MapPrototype.removeIn = MapPrototype.deleteIn = deleteIn;
  MapPrototype.update = update;
  MapPrototype.updateIn = updateIn;
  MapPrototype.merge = MapPrototype.concat = merge$1;
  MapPrototype.mergeWith = mergeWith$1;
  MapPrototype.mergeDeep = mergeDeep;
  MapPrototype.mergeDeepWith = mergeDeepWith;
  MapPrototype.mergeIn = mergeIn;
  MapPrototype.mergeDeepIn = mergeDeepIn;
  MapPrototype.withMutations = withMutations;
  MapPrototype.wasAltered = wasAltered;
  MapPrototype.asImmutable = asImmutable;
  MapPrototype['@@transducer/init'] = MapPrototype.asMutable = asMutable;
  MapPrototype['@@transducer/step'] = function (result, arr) {
    return result.set(arr[0], arr[1]);
  };
  MapPrototype['@@transducer/result'] = function (obj) {
    return obj.asImmutable();
  };

  // #pragma Trie Nodes

  var ArrayMapNode = function ArrayMapNode(ownerID, entries) {
    this.ownerID = ownerID;
    this.entries = entries;
  };

  ArrayMapNode.prototype.get = function get (shift, keyHash, key, notSetValue) {
    var entries = this.entries;
    for (var ii = 0, len = entries.length; ii < len; ii++) {
      if (is(key, entries[ii][0])) {
        return entries[ii][1];
      }
    }
    return notSetValue;
  };

  ArrayMapNode.prototype.update = function update (ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
    var removed = value === NOT_SET;

    var entries = this.entries;
    var idx = 0;
    var len = entries.length;
    for (; idx < len; idx++) {
      if (is(key, entries[idx][0])) {
        break;
      }
    }
    var exists = idx < len;

    if (exists ? entries[idx][1] === value : removed) {
      return this;
    }

    SetRef(didAlter);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
    (removed || !exists) && SetRef(didChangeSize);

    if (removed && entries.length === 1) {
      return; // undefined
    }

    if (!exists && !removed && entries.length >= MAX_ARRAY_MAP_SIZE) {
      return createNodes(ownerID, entries, key, value);
    }

    var isEditable = ownerID && ownerID === this.ownerID;
    var newEntries = isEditable ? entries : arrCopy(entries);

    if (exists) {
      if (removed) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
        idx === len - 1
          ? newEntries.pop()
          : (newEntries[idx] = newEntries.pop());
      } else {
        newEntries[idx] = [key, value];
      }
    } else {
      newEntries.push([key, value]);
    }

    if (isEditable) {
      this.entries = newEntries;
      return this;
    }

    return new ArrayMapNode(ownerID, newEntries);
  };

  var BitmapIndexedNode = function BitmapIndexedNode(ownerID, bitmap, nodes) {
    this.ownerID = ownerID;
    this.bitmap = bitmap;
    this.nodes = nodes;
  };

  BitmapIndexedNode.prototype.get = function get (shift, keyHash, key, notSetValue) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }
    var bit = 1 << ((shift === 0 ? keyHash : keyHash >>> shift) & MASK);
    var bitmap = this.bitmap;
    return (bitmap & bit) === 0
      ? notSetValue
      : this.nodes[popCount(bitmap & (bit - 1))].get(
          shift + SHIFT,
          keyHash,
          key,
          notSetValue
        );
  };

  BitmapIndexedNode.prototype.update = function update (ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }
    var keyHashFrag = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
    var bit = 1 << keyHashFrag;
    var bitmap = this.bitmap;
    var exists = (bitmap & bit) !== 0;

    if (!exists && value === NOT_SET) {
      return this;
    }

    var idx = popCount(bitmap & (bit - 1));
    var nodes = this.nodes;
    var node = exists ? nodes[idx] : undefined;
    var newNode = updateNode(
      node,
      ownerID,
      shift + SHIFT,
      keyHash,
      key,
      value,
      didChangeSize,
      didAlter
    );

    if (newNode === node) {
      return this;
    }

    if (!exists && newNode && nodes.length >= MAX_BITMAP_INDEXED_SIZE) {
      return expandNodes(ownerID, nodes, bitmap, keyHashFrag, newNode);
    }

    if (
      exists &&
      !newNode &&
      nodes.length === 2 &&
      isLeafNode(nodes[idx ^ 1])
    ) {
      return nodes[idx ^ 1];
    }

    if (exists && newNode && nodes.length === 1 && isLeafNode(newNode)) {
      return newNode;
    }

    var isEditable = ownerID && ownerID === this.ownerID;
    var newBitmap = exists ? (newNode ? bitmap : bitmap ^ bit) : bitmap | bit;
    var newNodes = exists
      ? newNode
        ? setAt(nodes, idx, newNode, isEditable)
        : spliceOut(nodes, idx, isEditable)
      : spliceIn(nodes, idx, newNode, isEditable);

    if (isEditable) {
      this.bitmap = newBitmap;
      this.nodes = newNodes;
      return this;
    }

    return new BitmapIndexedNode(ownerID, newBitmap, newNodes);
  };

  var HashArrayMapNode = function HashArrayMapNode(ownerID, count, nodes) {
    this.ownerID = ownerID;
    this.count = count;
    this.nodes = nodes;
  };

  HashArrayMapNode.prototype.get = function get (shift, keyHash, key, notSetValue) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }
    var idx = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
    var node = this.nodes[idx];
    return node
      ? node.get(shift + SHIFT, keyHash, key, notSetValue)
      : notSetValue;
  };

  HashArrayMapNode.prototype.update = function update (ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }
    var idx = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
    var removed = value === NOT_SET;
    var nodes = this.nodes;
    var node = nodes[idx];

    if (removed && !node) {
      return this;
    }

    var newNode = updateNode(
      node,
      ownerID,
      shift + SHIFT,
      keyHash,
      key,
      value,
      didChangeSize,
      didAlter
    );
    if (newNode === node) {
      return this;
    }

    var newCount = this.count;
    if (!node) {
      newCount++;
    } else if (!newNode) {
      newCount--;
      if (newCount < MIN_HASH_ARRAY_MAP_SIZE) {
        return packNodes(ownerID, nodes, newCount, idx);
      }
    }

    var isEditable = ownerID && ownerID === this.ownerID;
    var newNodes = setAt(nodes, idx, newNode, isEditable);

    if (isEditable) {
      this.count = newCount;
      this.nodes = newNodes;
      return this;
    }

    return new HashArrayMapNode(ownerID, newCount, newNodes);
  };

  var HashCollisionNode = function HashCollisionNode(ownerID, keyHash, entries) {
    this.ownerID = ownerID;
    this.keyHash = keyHash;
    this.entries = entries;
  };

  HashCollisionNode.prototype.get = function get (shift, keyHash, key, notSetValue) {
    var entries = this.entries;
    for (var ii = 0, len = entries.length; ii < len; ii++) {
      if (is(key, entries[ii][0])) {
        return entries[ii][1];
      }
    }
    return notSetValue;
  };

  HashCollisionNode.prototype.update = function update (ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
    if (keyHash === undefined) {
      keyHash = hash(key);
    }

    var removed = value === NOT_SET;

    if (keyHash !== this.keyHash) {
      if (removed) {
        return this;
      }
      SetRef(didAlter);
      SetRef(didChangeSize);
      return mergeIntoNode(this, ownerID, shift, keyHash, [key, value]);
    }

    var entries = this.entries;
    var idx = 0;
    var len = entries.length;
    for (; idx < len; idx++) {
      if (is(key, entries[idx][0])) {
        break;
      }
    }
    var exists = idx < len;

    if (exists ? entries[idx][1] === value : removed) {
      return this;
    }

    SetRef(didAlter);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
    (removed || !exists) && SetRef(didChangeSize);

    if (removed && len === 2) {
      return new ValueNode(ownerID, this.keyHash, entries[idx ^ 1]);
    }

    var isEditable = ownerID && ownerID === this.ownerID;
    var newEntries = isEditable ? entries : arrCopy(entries);

    if (exists) {
      if (removed) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
        idx === len - 1
          ? newEntries.pop()
          : (newEntries[idx] = newEntries.pop());
      } else {
        newEntries[idx] = [key, value];
      }
    } else {
      newEntries.push([key, value]);
    }

    if (isEditable) {
      this.entries = newEntries;
      return this;
    }

    return new HashCollisionNode(ownerID, this.keyHash, newEntries);
  };

  var ValueNode = function ValueNode(ownerID, keyHash, entry) {
    this.ownerID = ownerID;
    this.keyHash = keyHash;
    this.entry = entry;
  };

  ValueNode.prototype.get = function get (shift, keyHash, key, notSetValue) {
    return is(key, this.entry[0]) ? this.entry[1] : notSetValue;
  };

  ValueNode.prototype.update = function update (ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
    var removed = value === NOT_SET;
    var keyMatch = is(key, this.entry[0]);
    if (keyMatch ? value === this.entry[1] : removed) {
      return this;
    }

    SetRef(didAlter);

    if (removed) {
      SetRef(didChangeSize);
      return; // undefined
    }

    if (keyMatch) {
      if (ownerID && ownerID === this.ownerID) {
        this.entry[1] = value;
        return this;
      }
      return new ValueNode(ownerID, this.keyHash, [key, value]);
    }

    SetRef(didChangeSize);
    return mergeIntoNode(this, ownerID, shift, hash(key), [key, value]);
  };

  // #pragma Iterators

  ArrayMapNode.prototype.iterate = HashCollisionNode.prototype.iterate =
    function (fn, reverse) {
      var entries = this.entries;
      for (var ii = 0, maxIndex = entries.length - 1; ii <= maxIndex; ii++) {
        if (fn(entries[reverse ? maxIndex - ii : ii]) === false) {
          return false;
        }
      }
    };

  BitmapIndexedNode.prototype.iterate = HashArrayMapNode.prototype.iterate =
    function (fn, reverse) {
      var nodes = this.nodes;
      for (var ii = 0, maxIndex = nodes.length - 1; ii <= maxIndex; ii++) {
        var node = nodes[reverse ? maxIndex - ii : ii];
        if (node && node.iterate(fn, reverse) === false) {
          return false;
        }
      }
    };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ValueNode.prototype.iterate = function (fn, reverse) {
    return fn(this.entry);
  };

  var MapIterator = /*@__PURE__*/(function (Iterator) {
    function MapIterator(map, type, reverse) {
      this._type = type;
      this._reverse = reverse;
      this._stack = map._root && mapIteratorFrame(map._root);
    }

    if ( Iterator ) MapIterator.__proto__ = Iterator;
    MapIterator.prototype = Object.create( Iterator && Iterator.prototype );
    MapIterator.prototype.constructor = MapIterator;

    MapIterator.prototype.next = function next () {
      var type = this._type;
      var stack = this._stack;
      while (stack) {
        var node = stack.node;
        var index = stack.index++;
        var maxIndex = (void 0);
        if (node.entry) {
          if (index === 0) {
            return mapIteratorValue(type, node.entry);
          }
        } else if (node.entries) {
          maxIndex = node.entries.length - 1;
          if (index <= maxIndex) {
            return mapIteratorValue(
              type,
              node.entries[this._reverse ? maxIndex - index : index]
            );
          }
        } else {
          maxIndex = node.nodes.length - 1;
          if (index <= maxIndex) {
            var subNode = node.nodes[this._reverse ? maxIndex - index : index];
            if (subNode) {
              if (subNode.entry) {
                return mapIteratorValue(type, subNode.entry);
              }
              stack = this._stack = mapIteratorFrame(subNode, stack);
            }
            continue;
          }
        }
        stack = this._stack = this._stack.__prev;
      }
      return iteratorDone();
    };

    return MapIterator;
  }(Iterator));

  function mapIteratorValue(type, entry) {
    return iteratorValue(type, entry[0], entry[1]);
  }

  function mapIteratorFrame(node, prev) {
    return {
      node: node,
      index: 0,
      __prev: prev,
    };
  }

  function makeMap(size, root, ownerID, hash) {
    var map = Object.create(MapPrototype);
    map.size = size;
    map._root = root;
    map.__ownerID = ownerID;
    map.__hash = hash;
    map.__altered = false;
    return map;
  }

  var EMPTY_MAP;
  function emptyMap() {
    return EMPTY_MAP || (EMPTY_MAP = makeMap(0));
  }

  function updateMap(map, k, v) {
    var newRoot;
    var newSize;
    if (!map._root) {
      if (v === NOT_SET) {
        return map;
      }
      newSize = 1;
      newRoot = new ArrayMapNode(map.__ownerID, [[k, v]]);
    } else {
      var didChangeSize = MakeRef();
      var didAlter = MakeRef();
      newRoot = updateNode(
        map._root,
        map.__ownerID,
        0,
        undefined,
        k,
        v,
        didChangeSize,
        didAlter
      );
      if (!didAlter.value) {
        return map;
      }
      newSize = map.size + (didChangeSize.value ? (v === NOT_SET ? -1 : 1) : 0);
    }
    if (map.__ownerID) {
      map.size = newSize;
      map._root = newRoot;
      map.__hash = undefined;
      map.__altered = true;
      return map;
    }
    return newRoot ? makeMap(newSize, newRoot) : emptyMap();
  }

  function updateNode(
    node,
    ownerID,
    shift,
    keyHash,
    key,
    value,
    didChangeSize,
    didAlter
  ) {
    if (!node) {
      if (value === NOT_SET) {
        return node;
      }
      SetRef(didAlter);
      SetRef(didChangeSize);
      return new ValueNode(ownerID, keyHash, [key, value]);
    }
    return node.update(
      ownerID,
      shift,
      keyHash,
      key,
      value,
      didChangeSize,
      didAlter
    );
  }

  function isLeafNode(node) {
    return (
      node.constructor === ValueNode || node.constructor === HashCollisionNode
    );
  }

  function mergeIntoNode(node, ownerID, shift, keyHash, entry) {
    if (node.keyHash === keyHash) {
      return new HashCollisionNode(ownerID, keyHash, [node.entry, entry]);
    }

    var idx1 = (shift === 0 ? node.keyHash : node.keyHash >>> shift) & MASK;
    var idx2 = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;

    var newNode;
    var nodes =
      idx1 === idx2
        ? [mergeIntoNode(node, ownerID, shift + SHIFT, keyHash, entry)]
        : ((newNode = new ValueNode(ownerID, keyHash, entry)),
          idx1 < idx2 ? [node, newNode] : [newNode, node]);

    return new BitmapIndexedNode(ownerID, (1 << idx1) | (1 << idx2), nodes);
  }

  function createNodes(ownerID, entries, key, value) {
    if (!ownerID) {
      ownerID = new OwnerID();
    }
    var node = new ValueNode(ownerID, hash(key), [key, value]);
    for (var ii = 0; ii < entries.length; ii++) {
      var entry = entries[ii];
      node = node.update(ownerID, 0, undefined, entry[0], entry[1]);
    }
    return node;
  }

  function packNodes(ownerID, nodes, count, excluding) {
    var bitmap = 0;
    var packedII = 0;
    var packedNodes = new Array(count);
    for (var ii = 0, bit = 1, len = nodes.length; ii < len; ii++, bit <<= 1) {
      var node = nodes[ii];
      if (node !== undefined && ii !== excluding) {
        bitmap |= bit;
        packedNodes[packedII++] = node;
      }
    }
    return new BitmapIndexedNode(ownerID, bitmap, packedNodes);
  }

  function expandNodes(ownerID, nodes, bitmap, including, node) {
    var count = 0;
    var expandedNodes = new Array(SIZE);
    for (var ii = 0; bitmap !== 0; ii++, bitmap >>>= 1) {
      expandedNodes[ii] = bitmap & 1 ? nodes[count++] : undefined;
    }
    expandedNodes[including] = node;
    return new HashArrayMapNode(ownerID, count + 1, expandedNodes);
  }

  function popCount(x) {
    x -= (x >> 1) & 0x55555555;
    x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
    x = (x + (x >> 4)) & 0x0f0f0f0f;
    x += x >> 8;
    x += x >> 16;
    return x & 0x7f;
  }

  function setAt(array, idx, val, canEdit) {
    var newArray = canEdit ? array : arrCopy(array);
    newArray[idx] = val;
    return newArray;
  }

  function spliceIn(array, idx, val, canEdit) {
    var newLen = array.length + 1;
    if (canEdit && idx + 1 === newLen) {
      array[idx] = val;
      return array;
    }
    var newArray = new Array(newLen);
    var after = 0;
    for (var ii = 0; ii < newLen; ii++) {
      if (ii === idx) {
        newArray[ii] = val;
        after = -1;
      } else {
        newArray[ii] = array[ii + after];
      }
    }
    return newArray;
  }

  function spliceOut(array, idx, canEdit) {
    var newLen = array.length - 1;
    if (canEdit && idx === newLen) {
      array.pop();
      return array;
    }
    var newArray = new Array(newLen);
    var after = 0;
    for (var ii = 0; ii < newLen; ii++) {
      if (ii === idx) {
        after = 1;
      }
      newArray[ii] = array[ii + after];
    }
    return newArray;
  }

  var MAX_ARRAY_MAP_SIZE = SIZE / 4;
  var MAX_BITMAP_INDEXED_SIZE = SIZE / 2;
  var MIN_HASH_ARRAY_MAP_SIZE = SIZE / 4;

  var IS_LIST_SYMBOL = '@@__IMMUTABLE_LIST__@@';
  /**
   * True if `maybeList` is a List.
   */
  function isList(maybeList) {
      return Boolean(maybeList &&
          // @ts-expect-error: maybeList is typed as `{}`, need to change in 6.0 to `maybeList && typeof maybeList === 'object' && IS_LIST_SYMBOL in maybeList`
          maybeList[IS_LIST_SYMBOL]);
  }

  var List = /*@__PURE__*/(function (IndexedCollection) {
    function List(value) {
      var empty = emptyList();
      if (value === undefined || value === null) {
        // eslint-disable-next-line no-constructor-return
        return empty;
      }
      if (isList(value)) {
        // eslint-disable-next-line no-constructor-return
        return value;
      }
      var iter = IndexedCollection(value);
      var size = iter.size;
      if (size === 0) {
        // eslint-disable-next-line no-constructor-return
        return empty;
      }
      assertNotInfinite(size);
      if (size > 0 && size < SIZE) {
        // eslint-disable-next-line no-constructor-return
        return makeList(0, size, SHIFT, null, new VNode(iter.toArray()));
      }
      // eslint-disable-next-line no-constructor-return
      return empty.withMutations(function (list) {
        list.setSize(size);
        iter.forEach(function (v, i) { return list.set(i, v); });
      });
    }

    if ( IndexedCollection ) List.__proto__ = IndexedCollection;
    List.prototype = Object.create( IndexedCollection && IndexedCollection.prototype );
    List.prototype.constructor = List;

    List.of = function of (/*...values*/) {
      return this(arguments);
    };

    List.prototype.toString = function toString () {
      return this.__toString('List [', ']');
    };

    // @pragma Access

    List.prototype.get = function get (index, notSetValue) {
      index = wrapIndex(this, index);
      if (index >= 0 && index < this.size) {
        index += this._origin;
        var node = listNodeFor(this, index);
        return node && node.array[index & MASK];
      }
      return notSetValue;
    };

    // @pragma Modification

    List.prototype.set = function set (index, value) {
      return updateList(this, index, value);
    };

    List.prototype.remove = function remove (index) {
      return !this.has(index)
        ? this
        : index === 0
          ? this.shift()
          : index === this.size - 1
            ? this.pop()
            : this.splice(index, 1);
    };

    List.prototype.insert = function insert (index, value) {
      return this.splice(index, 0, value);
    };

    List.prototype.clear = function clear () {
      if (this.size === 0) {
        return this;
      }
      if (this.__ownerID) {
        this.size = this._origin = this._capacity = 0;
        this._level = SHIFT;
        this._root = this._tail = this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return emptyList();
    };

    List.prototype.push = function push (/*...values*/) {
      var values = arguments;
      var oldSize = this.size;
      return this.withMutations(function (list) {
        setListBounds(list, 0, oldSize + values.length);
        for (var ii = 0; ii < values.length; ii++) {
          list.set(oldSize + ii, values[ii]);
        }
      });
    };

    List.prototype.pop = function pop () {
      return setListBounds(this, 0, -1);
    };

    List.prototype.unshift = function unshift (/*...values*/) {
      var values = arguments;
      return this.withMutations(function (list) {
        setListBounds(list, -values.length);
        for (var ii = 0; ii < values.length; ii++) {
          list.set(ii, values[ii]);
        }
      });
    };

    List.prototype.shift = function shift () {
      return setListBounds(this, 1);
    };

    List.prototype.shuffle = function shuffle (random) {
      if ( random === void 0 ) random = Math.random;

      return this.withMutations(function (mutable) {
        // implementation of the Fisher-Yates shuffle: https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
        var current = mutable.size;
        var destination;
        var tmp;

        while (current) {
          destination = Math.floor(random() * current--);

          tmp = mutable.get(destination);
          mutable.set(destination, mutable.get(current));
          mutable.set(current, tmp);
        }
      });
    };

    // @pragma Composition

    List.prototype.concat = function concat (/*...collections*/) {
      var arguments$1 = arguments;

      var seqs = [];
      for (var i = 0; i < arguments.length; i++) {
        var argument = arguments$1[i];
        var seq = IndexedCollection(
          typeof argument !== 'string' && hasIterator(argument)
            ? argument
            : [argument]
        );
        if (seq.size !== 0) {
          seqs.push(seq);
        }
      }
      if (seqs.length === 0) {
        return this;
      }
      if (this.size === 0 && !this.__ownerID && seqs.length === 1) {
        return this.constructor(seqs[0]);
      }
      return this.withMutations(function (list) {
        seqs.forEach(function (seq) { return seq.forEach(function (value) { return list.push(value); }); });
      });
    };

    List.prototype.setSize = function setSize (size) {
      return setListBounds(this, 0, size);
    };

    List.prototype.map = function map (mapper, context) {
      var this$1$1 = this;

      return this.withMutations(function (list) {
        for (var i = 0; i < this$1$1.size; i++) {
          list.set(i, mapper.call(context, list.get(i), i, this$1$1));
        }
      });
    };

    // @pragma Iteration

    List.prototype.slice = function slice (begin, end) {
      var size = this.size;
      if (wholeSlice(begin, end, size)) {
        return this;
      }
      return setListBounds(
        this,
        resolveBegin(begin, size),
        resolveEnd(end, size)
      );
    };

    List.prototype.__iterator = function __iterator (type, reverse) {
      var index = reverse ? this.size : 0;
      var values = iterateList(this, reverse);
      return new Iterator(function () {
        var value = values();
        return value === DONE
          ? iteratorDone()
          : iteratorValue(type, reverse ? --index : index++, value);
      });
    };

    List.prototype.__iterate = function __iterate (fn, reverse) {
      var index = reverse ? this.size : 0;
      var values = iterateList(this, reverse);
      var value;
      while ((value = values()) !== DONE) {
        if (fn(value, reverse ? --index : index++, this) === false) {
          break;
        }
      }
      return index;
    };

    List.prototype.__ensureOwner = function __ensureOwner (ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      if (!ownerID) {
        if (this.size === 0) {
          return emptyList();
        }
        this.__ownerID = ownerID;
        this.__altered = false;
        return this;
      }
      return makeList(
        this._origin,
        this._capacity,
        this._level,
        this._root,
        this._tail,
        ownerID,
        this.__hash
      );
    };

    return List;
  }(IndexedCollection));

  List.isList = isList;

  var ListPrototype = List.prototype;
  ListPrototype[IS_LIST_SYMBOL] = true;
  ListPrototype[DELETE] = ListPrototype.remove;
  ListPrototype.merge = ListPrototype.concat;
  ListPrototype.setIn = setIn;
  ListPrototype.deleteIn = ListPrototype.removeIn = deleteIn;
  ListPrototype.update = update;
  ListPrototype.updateIn = updateIn;
  ListPrototype.mergeIn = mergeIn;
  ListPrototype.mergeDeepIn = mergeDeepIn;
  ListPrototype.withMutations = withMutations;
  ListPrototype.wasAltered = wasAltered;
  ListPrototype.asImmutable = asImmutable;
  ListPrototype['@@transducer/init'] = ListPrototype.asMutable = asMutable;
  ListPrototype['@@transducer/step'] = function (result, arr) {
    return result.push(arr);
  };
  ListPrototype['@@transducer/result'] = function (obj) {
    return obj.asImmutable();
  };

  var VNode = function VNode(array, ownerID) {
    this.array = array;
    this.ownerID = ownerID;
  };

  // TODO: seems like these methods are very similar

  VNode.prototype.removeBefore = function removeBefore (ownerID, level, index) {
    if (
      (index & ((1 << (level + SHIFT)) - 1)) === 0 ||
      this.array.length === 0
    ) {
      return this;
    }
    var originIndex = (index >>> level) & MASK;
    if (originIndex >= this.array.length) {
      return new VNode([], ownerID);
    }
    var removingFirst = originIndex === 0;
    var newChild;
    if (level > 0) {
      var oldChild = this.array[originIndex];
      newChild =
        oldChild && oldChild.removeBefore(ownerID, level - SHIFT, index);
      if (newChild === oldChild && removingFirst) {
        return this;
      }
    }
    if (removingFirst && !newChild) {
      return this;
    }
    var editable = editableVNode(this, ownerID);
    if (!removingFirst) {
      for (var ii = 0; ii < originIndex; ii++) {
        editable.array[ii] = undefined;
      }
    }
    if (newChild) {
      editable.array[originIndex] = newChild;
    }
    return editable;
  };

  VNode.prototype.removeAfter = function removeAfter (ownerID, level, index) {
    if (
      index === (level ? 1 << (level + SHIFT) : SIZE) ||
      this.array.length === 0
    ) {
      return this;
    }
    var sizeIndex = ((index - 1) >>> level) & MASK;
    if (sizeIndex >= this.array.length) {
      return this;
    }

    var newChild;
    if (level > 0) {
      var oldChild = this.array[sizeIndex];
      newChild =
        oldChild && oldChild.removeAfter(ownerID, level - SHIFT, index);
      if (newChild === oldChild && sizeIndex === this.array.length - 1) {
        return this;
      }
    }

    var editable = editableVNode(this, ownerID);
    editable.array.splice(sizeIndex + 1);
    if (newChild) {
      editable.array[sizeIndex] = newChild;
    }
    return editable;
  };

  var DONE = {};

  function iterateList(list, reverse) {
    var left = list._origin;
    var right = list._capacity;
    var tailPos = getTailOffset(right);
    var tail = list._tail;

    return iterateNodeOrLeaf(list._root, list._level, 0);

    function iterateNodeOrLeaf(node, level, offset) {
      return level === 0
        ? iterateLeaf(node, offset)
        : iterateNode(node, level, offset);
    }

    function iterateLeaf(node, offset) {
      var array = offset === tailPos ? tail && tail.array : node && node.array;
      var from = offset > left ? 0 : left - offset;
      var to = right - offset;
      if (to > SIZE) {
        to = SIZE;
      }
      return function () {
        if (from === to) {
          return DONE;
        }
        var idx = reverse ? --to : from++;
        return array && array[idx];
      };
    }

    function iterateNode(node, level, offset) {
      var values;
      var array = node && node.array;
      var from = offset > left ? 0 : (left - offset) >> level;
      var to = ((right - offset) >> level) + 1;
      if (to > SIZE) {
        to = SIZE;
      }
      return function () {
        while (true) {
          if (values) {
            var value = values();
            if (value !== DONE) {
              return value;
            }
            values = null;
          }
          if (from === to) {
            return DONE;
          }
          var idx = reverse ? --to : from++;
          values = iterateNodeOrLeaf(
            array && array[idx],
            level - SHIFT,
            offset + (idx << level)
          );
        }
      };
    }
  }

  function makeList(origin, capacity, level, root, tail, ownerID, hash) {
    var list = Object.create(ListPrototype);
    list.size = capacity - origin;
    list._origin = origin;
    list._capacity = capacity;
    list._level = level;
    list._root = root;
    list._tail = tail;
    list.__ownerID = ownerID;
    list.__hash = hash;
    list.__altered = false;
    return list;
  }

  function emptyList() {
    return makeList(0, 0, SHIFT);
  }

  function updateList(list, index, value) {
    index = wrapIndex(list, index);

    if (index !== index) {
      return list;
    }

    if (index >= list.size || index < 0) {
      return list.withMutations(function (list) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
        index < 0
          ? setListBounds(list, index).set(0, value)
          : setListBounds(list, 0, index + 1).set(index, value);
      });
    }

    index += list._origin;

    var newTail = list._tail;
    var newRoot = list._root;
    var didAlter = MakeRef();
    if (index >= getTailOffset(list._capacity)) {
      newTail = updateVNode(newTail, list.__ownerID, 0, index, value, didAlter);
    } else {
      newRoot = updateVNode(
        newRoot,
        list.__ownerID,
        list._level,
        index,
        value,
        didAlter
      );
    }

    if (!didAlter.value) {
      return list;
    }

    if (list.__ownerID) {
      list._root = newRoot;
      list._tail = newTail;
      list.__hash = undefined;
      list.__altered = true;
      return list;
    }
    return makeList(list._origin, list._capacity, list._level, newRoot, newTail);
  }

  function updateVNode(node, ownerID, level, index, value, didAlter) {
    var idx = (index >>> level) & MASK;
    var nodeHas = node && idx < node.array.length;
    if (!nodeHas && value === undefined) {
      return node;
    }

    var newNode;

    if (level > 0) {
      var lowerNode = node && node.array[idx];
      var newLowerNode = updateVNode(
        lowerNode,
        ownerID,
        level - SHIFT,
        index,
        value,
        didAlter
      );
      if (newLowerNode === lowerNode) {
        return node;
      }
      newNode = editableVNode(node, ownerID);
      newNode.array[idx] = newLowerNode;
      return newNode;
    }

    if (nodeHas && node.array[idx] === value) {
      return node;
    }

    if (didAlter) {
      SetRef(didAlter);
    }

    newNode = editableVNode(node, ownerID);
    if (value === undefined && idx === newNode.array.length - 1) {
      newNode.array.pop();
    } else {
      newNode.array[idx] = value;
    }
    return newNode;
  }

  function editableVNode(node, ownerID) {
    if (ownerID && node && ownerID === node.ownerID) {
      return node;
    }
    return new VNode(node ? node.array.slice() : [], ownerID);
  }

  function listNodeFor(list, rawIndex) {
    if (rawIndex >= getTailOffset(list._capacity)) {
      return list._tail;
    }
    if (rawIndex < 1 << (list._level + SHIFT)) {
      var node = list._root;
      var level = list._level;
      while (node && level > 0) {
        node = node.array[(rawIndex >>> level) & MASK];
        level -= SHIFT;
      }
      return node;
    }
  }

  function setListBounds(list, begin, end) {
    // Sanitize begin & end using this shorthand for ToInt32(argument)
    // http://www.ecma-international.org/ecma-262/6.0/#sec-toint32
    if (begin !== undefined) {
      begin |= 0;
    }
    if (end !== undefined) {
      end |= 0;
    }
    var owner = list.__ownerID || new OwnerID();
    var oldOrigin = list._origin;
    var oldCapacity = list._capacity;
    var newOrigin = oldOrigin + begin;
    var newCapacity =
      end === undefined
        ? oldCapacity
        : end < 0
          ? oldCapacity + end
          : oldOrigin + end;
    if (newOrigin === oldOrigin && newCapacity === oldCapacity) {
      return list;
    }

    // If it's going to end after it starts, it's empty.
    if (newOrigin >= newCapacity) {
      return list.clear();
    }

    var newLevel = list._level;
    var newRoot = list._root;

    // New origin might need creating a higher root.
    var offsetShift = 0;
    while (newOrigin + offsetShift < 0) {
      newRoot = new VNode(
        newRoot && newRoot.array.length ? [undefined, newRoot] : [],
        owner
      );
      newLevel += SHIFT;
      offsetShift += 1 << newLevel;
    }
    if (offsetShift) {
      newOrigin += offsetShift;
      oldOrigin += offsetShift;
      newCapacity += offsetShift;
      oldCapacity += offsetShift;
    }

    var oldTailOffset = getTailOffset(oldCapacity);
    var newTailOffset = getTailOffset(newCapacity);

    // New size might need creating a higher root.
    while (newTailOffset >= 1 << (newLevel + SHIFT)) {
      newRoot = new VNode(
        newRoot && newRoot.array.length ? [newRoot] : [],
        owner
      );
      newLevel += SHIFT;
    }

    // Locate or create the new tail.
    var oldTail = list._tail;
    var newTail =
      newTailOffset < oldTailOffset
        ? listNodeFor(list, newCapacity - 1)
        : newTailOffset > oldTailOffset
          ? new VNode([], owner)
          : oldTail;

    // Merge Tail into tree.
    if (
      oldTail &&
      newTailOffset > oldTailOffset &&
      newOrigin < oldCapacity &&
      oldTail.array.length
    ) {
      newRoot = editableVNode(newRoot, owner);
      var node = newRoot;
      for (var level = newLevel; level > SHIFT; level -= SHIFT) {
        var idx = (oldTailOffset >>> level) & MASK;
        node = node.array[idx] = editableVNode(node.array[idx], owner);
      }
      node.array[(oldTailOffset >>> SHIFT) & MASK] = oldTail;
    }

    // If the size has been reduced, there's a chance the tail needs to be trimmed.
    if (newCapacity < oldCapacity) {
      newTail = newTail && newTail.removeAfter(owner, 0, newCapacity);
    }

    // If the new origin is within the tail, then we do not need a root.
    if (newOrigin >= newTailOffset) {
      newOrigin -= newTailOffset;
      newCapacity -= newTailOffset;
      newLevel = SHIFT;
      newRoot = null;
      newTail = newTail && newTail.removeBefore(owner, 0, newOrigin);

      // Otherwise, if the root has been trimmed, garbage collect.
    } else if (newOrigin > oldOrigin || newTailOffset < oldTailOffset) {
      offsetShift = 0;

      // Identify the new top root node of the subtree of the old root.
      while (newRoot) {
        var beginIndex = (newOrigin >>> newLevel) & MASK;
        if ((beginIndex !== newTailOffset >>> newLevel) & MASK) {
          break;
        }
        if (beginIndex) {
          offsetShift += (1 << newLevel) * beginIndex;
        }
        newLevel -= SHIFT;
        newRoot = newRoot.array[beginIndex];
      }

      // Trim the new sides of the new root.
      if (newRoot && newOrigin > oldOrigin) {
        newRoot = newRoot.removeBefore(owner, newLevel, newOrigin - offsetShift);
      }
      if (newRoot && newTailOffset < oldTailOffset) {
        newRoot = newRoot.removeAfter(
          owner,
          newLevel,
          newTailOffset - offsetShift
        );
      }
      if (offsetShift) {
        newOrigin -= offsetShift;
        newCapacity -= offsetShift;
      }
    }

    if (list.__ownerID) {
      list.size = newCapacity - newOrigin;
      list._origin = newOrigin;
      list._capacity = newCapacity;
      list._level = newLevel;
      list._root = newRoot;
      list._tail = newTail;
      list.__hash = undefined;
      list.__altered = true;
      return list;
    }
    return makeList(newOrigin, newCapacity, newLevel, newRoot, newTail);
  }

  function getTailOffset(size) {
    return size < SIZE ? 0 : ((size - 1) >>> SHIFT) << SHIFT;
  }

  var OrderedMap = /*@__PURE__*/(function (Map) {
    function OrderedMap(value) {
      // eslint-disable-next-line no-constructor-return
      return value === undefined || value === null
        ? emptyOrderedMap()
        : isOrderedMap(value)
          ? value
          : emptyOrderedMap().withMutations(function (map) {
              var iter = KeyedCollection(value);
              assertNotInfinite(iter.size);
              iter.forEach(function (v, k) { return map.set(k, v); });
            });
    }

    if ( Map ) OrderedMap.__proto__ = Map;
    OrderedMap.prototype = Object.create( Map && Map.prototype );
    OrderedMap.prototype.constructor = OrderedMap;

    OrderedMap.of = function of (/*...values*/) {
      return this(arguments);
    };

    OrderedMap.prototype.toString = function toString () {
      return this.__toString('OrderedMap {', '}');
    };

    // @pragma Access

    OrderedMap.prototype.get = function get (k, notSetValue) {
      var index = this._map.get(k);
      return index !== undefined ? this._list.get(index)[1] : notSetValue;
    };

    // @pragma Modification

    OrderedMap.prototype.clear = function clear () {
      if (this.size === 0) {
        return this;
      }
      if (this.__ownerID) {
        this.size = 0;
        this._map.clear();
        this._list.clear();
        this.__altered = true;
        return this;
      }
      return emptyOrderedMap();
    };

    OrderedMap.prototype.set = function set (k, v) {
      return updateOrderedMap(this, k, v);
    };

    OrderedMap.prototype.remove = function remove (k) {
      return updateOrderedMap(this, k, NOT_SET);
    };

    OrderedMap.prototype.__iterate = function __iterate (fn, reverse) {
      var this$1$1 = this;

      return this._list.__iterate(
        function (entry) { return entry && fn(entry[1], entry[0], this$1$1); },
        reverse
      );
    };

    OrderedMap.prototype.__iterator = function __iterator (type, reverse) {
      return this._list.fromEntrySeq().__iterator(type, reverse);
    };

    OrderedMap.prototype.__ensureOwner = function __ensureOwner (ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      var newMap = this._map.__ensureOwner(ownerID);
      var newList = this._list.__ensureOwner(ownerID);
      if (!ownerID) {
        if (this.size === 0) {
          return emptyOrderedMap();
        }
        this.__ownerID = ownerID;
        this.__altered = false;
        this._map = newMap;
        this._list = newList;
        return this;
      }
      return makeOrderedMap(newMap, newList, ownerID, this.__hash);
    };

    return OrderedMap;
  }(Map$1));

  OrderedMap.isOrderedMap = isOrderedMap;

  OrderedMap.prototype[IS_ORDERED_SYMBOL] = true;
  OrderedMap.prototype[DELETE] = OrderedMap.prototype.remove;

  function makeOrderedMap(map, list, ownerID, hash) {
    var omap = Object.create(OrderedMap.prototype);
    omap.size = map ? map.size : 0;
    omap._map = map;
    omap._list = list;
    omap.__ownerID = ownerID;
    omap.__hash = hash;
    omap.__altered = false;
    return omap;
  }

  var EMPTY_ORDERED_MAP;
  function emptyOrderedMap() {
    return (
      EMPTY_ORDERED_MAP ||
      (EMPTY_ORDERED_MAP = makeOrderedMap(emptyMap(), emptyList()))
    );
  }

  function updateOrderedMap(omap, k, v) {
    var map = omap._map;
    var list = omap._list;
    var i = map.get(k);
    var has = i !== undefined;
    var newMap;
    var newList;
    if (v === NOT_SET) {
      // removed
      if (!has) {
        return omap;
      }
      if (list.size >= SIZE && list.size >= map.size * 2) {
        newList = list.filter(function (entry, idx) { return entry !== undefined && i !== idx; });
        newMap = newList
          .toKeyedSeq()
          .map(function (entry) { return entry[0]; })
          .flip()
          .toMap();
        if (omap.__ownerID) {
          newMap.__ownerID = newList.__ownerID = omap.__ownerID;
        }
      } else {
        newMap = map.remove(k);
        newList = i === list.size - 1 ? list.pop() : list.set(i, undefined);
      }
    } else if (has) {
      if (v === list.get(i)[1]) {
        return omap;
      }
      newMap = map;
      newList = list.set(i, [k, v]);
    } else {
      newMap = map.set(k, list.size);
      newList = list.set(list.size, [k, v]);
    }
    if (omap.__ownerID) {
      omap.size = newMap.size;
      omap._map = newMap;
      omap._list = newList;
      omap.__hash = undefined;
      omap.__altered = true;
      return omap;
    }
    return makeOrderedMap(newMap, newList);
  }

  var IS_STACK_SYMBOL = '@@__IMMUTABLE_STACK__@@';
  /**
   * True if `maybeStack` is a Stack.
   */
  function isStack(maybeStack) {
      return Boolean(maybeStack &&
          // @ts-expect-error: maybeStack is typed as `{}`, need to change in 6.0 to `maybeStack && typeof maybeStack === 'object' && MAYBE_STACK_SYMBOL in maybeStack`
          maybeStack[IS_STACK_SYMBOL]);
  }

  var Stack = /*@__PURE__*/(function (IndexedCollection) {
    function Stack(value) {
      // eslint-disable-next-line no-constructor-return
      return value === undefined || value === null
        ? emptyStack()
        : isStack(value)
          ? value
          : emptyStack().pushAll(value);
    }

    if ( IndexedCollection ) Stack.__proto__ = IndexedCollection;
    Stack.prototype = Object.create( IndexedCollection && IndexedCollection.prototype );
    Stack.prototype.constructor = Stack;

    Stack.of = function of (/*...values*/) {
      return this(arguments);
    };

    Stack.prototype.toString = function toString () {
      return this.__toString('Stack [', ']');
    };

    // @pragma Access

    Stack.prototype.get = function get (index, notSetValue) {
      var head = this._head;
      index = wrapIndex(this, index);
      while (head && index--) {
        head = head.next;
      }
      return head ? head.value : notSetValue;
    };

    Stack.prototype.peek = function peek () {
      return this._head && this._head.value;
    };

    // @pragma Modification

    Stack.prototype.push = function push (/*...values*/) {
      var arguments$1 = arguments;

      if (arguments.length === 0) {
        return this;
      }
      var newSize = this.size + arguments.length;
      var head = this._head;
      for (var ii = arguments.length - 1; ii >= 0; ii--) {
        head = {
          value: arguments$1[ii],
          next: head,
        };
      }
      if (this.__ownerID) {
        this.size = newSize;
        this._head = head;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return makeStack(newSize, head);
    };

    Stack.prototype.pushAll = function pushAll (iter) {
      iter = IndexedCollection(iter);
      if (iter.size === 0) {
        return this;
      }
      if (this.size === 0 && isStack(iter)) {
        return iter;
      }
      assertNotInfinite(iter.size);
      var newSize = this.size;
      var head = this._head;
      iter.__iterate(function (value) {
        newSize++;
        head = {
          value: value,
          next: head,
        };
      }, /* reverse */ true);
      if (this.__ownerID) {
        this.size = newSize;
        this._head = head;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return makeStack(newSize, head);
    };

    Stack.prototype.pop = function pop () {
      return this.slice(1);
    };

    Stack.prototype.clear = function clear () {
      if (this.size === 0) {
        return this;
      }
      if (this.__ownerID) {
        this.size = 0;
        this._head = undefined;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return emptyStack();
    };

    Stack.prototype.slice = function slice (begin, end) {
      if (wholeSlice(begin, end, this.size)) {
        return this;
      }
      var resolvedBegin = resolveBegin(begin, this.size);
      var resolvedEnd = resolveEnd(end, this.size);
      if (resolvedEnd !== this.size) {
        // super.slice(begin, end);
        return IndexedCollection.prototype.slice.call(this, begin, end);
      }
      var newSize = this.size - resolvedBegin;
      var head = this._head;
      while (resolvedBegin--) {
        head = head.next;
      }
      if (this.__ownerID) {
        this.size = newSize;
        this._head = head;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return makeStack(newSize, head);
    };

    // @pragma Mutability

    Stack.prototype.__ensureOwner = function __ensureOwner (ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      if (!ownerID) {
        if (this.size === 0) {
          return emptyStack();
        }
        this.__ownerID = ownerID;
        this.__altered = false;
        return this;
      }
      return makeStack(this.size, this._head, ownerID, this.__hash);
    };

    // @pragma Iteration

    Stack.prototype.__iterate = function __iterate (fn, reverse) {
      var this$1$1 = this;

      if (reverse) {
        return new ArraySeq(this.toArray()).__iterate(
          function (v, k) { return fn(v, k, this$1$1); },
          reverse
        );
      }
      var iterations = 0;
      var node = this._head;
      while (node) {
        if (fn(node.value, iterations++, this) === false) {
          break;
        }
        node = node.next;
      }
      return iterations;
    };

    Stack.prototype.__iterator = function __iterator (type, reverse) {
      if (reverse) {
        return new ArraySeq(this.toArray()).__iterator(type, reverse);
      }
      var iterations = 0;
      var node = this._head;
      return new Iterator(function () {
        if (node) {
          var value = node.value;
          node = node.next;
          return iteratorValue(type, iterations++, value);
        }
        return iteratorDone();
      });
    };

    return Stack;
  }(IndexedCollection));

  Stack.isStack = isStack;

  var StackPrototype = Stack.prototype;
  StackPrototype[IS_STACK_SYMBOL] = true;
  StackPrototype.shift = StackPrototype.pop;
  StackPrototype.unshift = StackPrototype.push;
  StackPrototype.unshiftAll = StackPrototype.pushAll;
  StackPrototype.withMutations = withMutations;
  StackPrototype.wasAltered = wasAltered;
  StackPrototype.asImmutable = asImmutable;
  StackPrototype['@@transducer/init'] = StackPrototype.asMutable = asMutable;
  StackPrototype['@@transducer/step'] = function (result, arr) {
    return result.unshift(arr);
  };
  StackPrototype['@@transducer/result'] = function (obj) {
    return obj.asImmutable();
  };

  function makeStack(size, head, ownerID, hash) {
    var map = Object.create(StackPrototype);
    map.size = size;
    map._head = head;
    map.__ownerID = ownerID;
    map.__hash = hash;
    map.__altered = false;
    return map;
  }

  var EMPTY_STACK;
  function emptyStack() {
    return EMPTY_STACK || (EMPTY_STACK = makeStack(0));
  }

  var IS_SET_SYMBOL = '@@__IMMUTABLE_SET__@@';
  /**
   * True if `maybeSet` is a Set.
   *
   * Also true for OrderedSets.
   */
  function isSet(maybeSet) {
      return Boolean(maybeSet &&
          // @ts-expect-error: maybeSet is typed as `{}`,  need to change in 6.0 to `maybeSeq && typeof maybeSet === 'object' && MAYBE_SET_SYMBOL in maybeSet`
          maybeSet[IS_SET_SYMBOL]);
  }

  /**
   * True if `maybeOrderedSet` is an OrderedSet.
   */
  function isOrderedSet(maybeOrderedSet) {
      return isSet(maybeOrderedSet) && isOrdered(maybeOrderedSet);
  }

  function deepEqual(a, b) {
      if (a === b) {
          return true;
      }
      if (!isCollection(b) ||
          // @ts-expect-error size should exists on Collection
          (a.size !== undefined && b.size !== undefined && a.size !== b.size) ||
          // @ts-expect-error __hash exists on Collection
          (a.__hash !== undefined &&
              // @ts-expect-error __hash exists on Collection
              b.__hash !== undefined &&
              // @ts-expect-error __hash exists on Collection
              a.__hash !== b.__hash) ||
          isKeyed(a) !== isKeyed(b) ||
          isIndexed(a) !== isIndexed(b) ||
          // @ts-expect-error Range extends Collection, which implements [Symbol.iterator], so it is valid
          isOrdered(a) !== isOrdered(b)) {
          return false;
      }
      // @ts-expect-error size should exists on Collection
      if (a.size === 0 && b.size === 0) {
          return true;
      }
      var notAssociative = !isAssociative(a);
      // @ts-expect-error Range extends Collection, which implements [Symbol.iterator], so it is valid
      if (isOrdered(a)) {
          var entries = a.entries();
          // @ts-expect-error need to cast as boolean
          return (b.every(function (v, k) {
              var entry = entries.next().value;
              return entry && is(entry[1], v) && (notAssociative || is(entry[0], k));
          }) && entries.next().done);
      }
      var flipped = false;
      if (a.size === undefined) {
          // @ts-expect-error size should exists on Collection
          if (b.size === undefined) {
              if (typeof a.cacheResult === 'function') {
                  a.cacheResult();
              }
          }
          else {
              flipped = true;
              var _ = a;
              a = b;
              b = _;
          }
      }
      var allEqual = true;
      var bSize = 
      // @ts-expect-error b is Range | Repeat | Collection<unknown, unknown> as it may have been flipped, and __iterate is valid
      b.__iterate(function (v, k) {
          if (notAssociative
              ? // @ts-expect-error has exists on Collection
                  !a.has(v)
              : flipped
                  ? // @ts-expect-error type of `get` does not "catch" the version with `notSetValue`
                      !is(v, a.get(k, NOT_SET))
                  : // @ts-expect-error type of `get` does not "catch" the version with `notSetValue`
                      !is(a.get(k, NOT_SET), v)) {
              allEqual = false;
              return false;
          }
      });
      return (allEqual &&
          // @ts-expect-error size should exists on Collection
          a.size === bSize);
  }

  /**
   * Contributes additional methods to a constructor
   */
  function mixin(ctor, 
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  methods) {
      var keyCopier = function (key) {
          // @ts-expect-error how to handle symbol ?
          ctor.prototype[key] = methods[key];
      };
      Object.keys(methods).forEach(keyCopier);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
      Object.getOwnPropertySymbols &&
          Object.getOwnPropertySymbols(methods).forEach(keyCopier);
      return ctor;
  }

  function toJS(value) {
    if (!value || typeof value !== 'object') {
      return value;
    }
    if (!isCollection(value)) {
      if (!isDataStructure(value)) {
        return value;
      }
      value = Seq(value);
    }
    if (isKeyed(value)) {
      var result$1 = {};
      value.__iterate(function (v, k) {
        result$1[k] = toJS(v);
      });
      return result$1;
    }
    var result = [];
    value.__iterate(function (v) {
      result.push(toJS(v));
    });
    return result;
  }

  var Set$1 = /*@__PURE__*/(function (SetCollection) {
    function Set(value) {
      // eslint-disable-next-line no-constructor-return
      return value === undefined || value === null
        ? emptySet()
        : isSet(value) && !isOrdered(value)
          ? value
          : emptySet().withMutations(function (set) {
              var iter = SetCollection(value);
              assertNotInfinite(iter.size);
              iter.forEach(function (v) { return set.add(v); });
            });
    }

    if ( SetCollection ) Set.__proto__ = SetCollection;
    Set.prototype = Object.create( SetCollection && SetCollection.prototype );
    Set.prototype.constructor = Set;

    Set.of = function of (/*...values*/) {
      return this(arguments);
    };

    Set.fromKeys = function fromKeys (value) {
      return this(KeyedCollection(value).keySeq());
    };

    Set.intersect = function intersect (sets) {
      sets = Collection(sets).toArray();
      return sets.length
        ? SetPrototype.intersect.apply(Set(sets.pop()), sets)
        : emptySet();
    };

    Set.union = function union (sets) {
      sets = Collection(sets).toArray();
      return sets.length
        ? SetPrototype.union.apply(Set(sets.pop()), sets)
        : emptySet();
    };

    Set.prototype.toString = function toString () {
      return this.__toString('Set {', '}');
    };

    // @pragma Access

    Set.prototype.has = function has (value) {
      return this._map.has(value);
    };

    // @pragma Modification

    Set.prototype.add = function add (value) {
      return updateSet(this, this._map.set(value, value));
    };

    Set.prototype.remove = function remove (value) {
      return updateSet(this, this._map.remove(value));
    };

    Set.prototype.clear = function clear () {
      return updateSet(this, this._map.clear());
    };

    // @pragma Composition

    Set.prototype.map = function map (mapper, context) {
      var this$1$1 = this;

      // keep track if the set is altered by the map function
      var didChanges = false;

      var newMap = updateSet(
        this,
        this._map.mapEntries(function (ref) {
          var v = ref[1];

          var mapped = mapper.call(context, v, v, this$1$1);

          if (mapped !== v) {
            didChanges = true;
          }

          return [mapped, mapped];
        }, context)
      );

      return didChanges ? newMap : this;
    };

    Set.prototype.union = function union () {
      var iters = [], len = arguments.length;
      while ( len-- ) iters[ len ] = arguments[ len ];

      iters = iters.filter(function (x) { return x.size !== 0; });
      if (iters.length === 0) {
        return this;
      }
      if (this.size === 0 && !this.__ownerID && iters.length === 1) {
        return this.constructor(iters[0]);
      }
      return this.withMutations(function (set) {
        for (var ii = 0; ii < iters.length; ii++) {
          if (typeof iters[ii] === 'string') {
            set.add(iters[ii]);
          } else {
            SetCollection(iters[ii]).forEach(function (value) { return set.add(value); });
          }
        }
      });
    };

    Set.prototype.intersect = function intersect () {
      var iters = [], len = arguments.length;
      while ( len-- ) iters[ len ] = arguments[ len ];

      if (iters.length === 0) {
        return this;
      }
      iters = iters.map(function (iter) { return SetCollection(iter); });
      var toRemove = [];
      this.forEach(function (value) {
        if (!iters.every(function (iter) { return iter.includes(value); })) {
          toRemove.push(value);
        }
      });
      return this.withMutations(function (set) {
        toRemove.forEach(function (value) {
          set.remove(value);
        });
      });
    };

    Set.prototype.subtract = function subtract () {
      var iters = [], len = arguments.length;
      while ( len-- ) iters[ len ] = arguments[ len ];

      if (iters.length === 0) {
        return this;
      }
      iters = iters.map(function (iter) { return SetCollection(iter); });
      var toRemove = [];
      this.forEach(function (value) {
        if (iters.some(function (iter) { return iter.includes(value); })) {
          toRemove.push(value);
        }
      });
      return this.withMutations(function (set) {
        toRemove.forEach(function (value) {
          set.remove(value);
        });
      });
    };

    Set.prototype.sort = function sort (comparator) {
      // Late binding
      return OrderedSet(sortFactory(this, comparator));
    };

    Set.prototype.sortBy = function sortBy (mapper, comparator) {
      // Late binding
      return OrderedSet(sortFactory(this, comparator, mapper));
    };

    Set.prototype.wasAltered = function wasAltered () {
      return this._map.wasAltered();
    };

    Set.prototype.__iterate = function __iterate (fn, reverse) {
      var this$1$1 = this;

      return this._map.__iterate(function (k) { return fn(k, k, this$1$1); }, reverse);
    };

    Set.prototype.__iterator = function __iterator (type, reverse) {
      return this._map.__iterator(type, reverse);
    };

    Set.prototype.__ensureOwner = function __ensureOwner (ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      var newMap = this._map.__ensureOwner(ownerID);
      if (!ownerID) {
        if (this.size === 0) {
          return this.__empty();
        }
        this.__ownerID = ownerID;
        this._map = newMap;
        return this;
      }
      return this.__make(newMap, ownerID);
    };

    return Set;
  }(SetCollection));

  Set$1.isSet = isSet;

  var SetPrototype = Set$1.prototype;
  SetPrototype[IS_SET_SYMBOL] = true;
  SetPrototype[DELETE] = SetPrototype.remove;
  SetPrototype.merge = SetPrototype.concat = SetPrototype.union;
  SetPrototype.withMutations = withMutations;
  SetPrototype.asImmutable = asImmutable;
  SetPrototype['@@transducer/init'] = SetPrototype.asMutable = asMutable;
  SetPrototype['@@transducer/step'] = function (result, arr) {
    return result.add(arr);
  };
  SetPrototype['@@transducer/result'] = function (obj) {
    return obj.asImmutable();
  };

  SetPrototype.__empty = emptySet;
  SetPrototype.__make = makeSet;

  function updateSet(set, newMap) {
    if (set.__ownerID) {
      set.size = newMap.size;
      set._map = newMap;
      return set;
    }
    return newMap === set._map
      ? set
      : newMap.size === 0
        ? set.__empty()
        : set.__make(newMap);
  }

  function makeSet(map, ownerID) {
    var set = Object.create(SetPrototype);
    set.size = map ? map.size : 0;
    set._map = map;
    set.__ownerID = ownerID;
    return set;
  }

  var EMPTY_SET;
  function emptySet() {
    return EMPTY_SET || (EMPTY_SET = makeSet(emptyMap()));
  }

  /**
   * Returns a lazy seq of nums from start (inclusive) to end
   * (exclusive), by step, where start defaults to 0, step to 1, and end to
   * infinity. When start is equal to end, returns empty list.
   */
  var Range = /*@__PURE__*/(function (IndexedSeq) {
    function Range(start, end, step) {
      if ( step === void 0 ) step = 1;

      if (!(this instanceof Range)) {
        // eslint-disable-next-line no-constructor-return
        return new Range(start, end, step);
      }
      invariant(step !== 0, 'Cannot step a Range by 0');
      invariant(
        start !== undefined,
        'You must define a start value when using Range'
      );
      invariant(
        end !== undefined,
        'You must define an end value when using Range'
      );

      step = Math.abs(step);
      if (end < start) {
        step = -step;
      }
      this._start = start;
      this._end = end;
      this._step = step;
      this.size = Math.max(0, Math.ceil((end - start) / step - 1) + 1);
      if (this.size === 0) {
        if (EMPTY_RANGE) {
          // eslint-disable-next-line no-constructor-return
          return EMPTY_RANGE;
        }
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        EMPTY_RANGE = this;
      }
    }

    if ( IndexedSeq ) Range.__proto__ = IndexedSeq;
    Range.prototype = Object.create( IndexedSeq && IndexedSeq.prototype );
    Range.prototype.constructor = Range;

    Range.prototype.toString = function toString () {
      return this.size === 0
        ? 'Range []'
        : ("Range [ " + (this._start) + "..." + (this._end) + (this._step !== 1 ? ' by ' + this._step : '') + " ]");
    };

    Range.prototype.get = function get (index, notSetValue) {
      return this.has(index)
        ? this._start + wrapIndex(this, index) * this._step
        : notSetValue;
    };

    Range.prototype.includes = function includes (searchValue) {
      var possibleIndex = (searchValue - this._start) / this._step;
      return (
        possibleIndex >= 0 &&
        possibleIndex < this.size &&
        possibleIndex === Math.floor(possibleIndex)
      );
    };

    Range.prototype.slice = function slice (begin, end) {
      if (wholeSlice(begin, end, this.size)) {
        return this;
      }
      begin = resolveBegin(begin, this.size);
      end = resolveEnd(end, this.size);
      if (end <= begin) {
        return new Range(0, 0);
      }
      return new Range(
        this.get(begin, this._end),
        this.get(end, this._end),
        this._step
      );
    };

    Range.prototype.indexOf = function indexOf (searchValue) {
      var offsetValue = searchValue - this._start;
      if (offsetValue % this._step === 0) {
        var index = offsetValue / this._step;
        if (index >= 0 && index < this.size) {
          return index;
        }
      }
      return -1;
    };

    Range.prototype.lastIndexOf = function lastIndexOf (searchValue) {
      return this.indexOf(searchValue);
    };

    Range.prototype.__iterate = function __iterate (fn, reverse) {
      var size = this.size;
      var step = this._step;
      var value = reverse ? this._start + (size - 1) * step : this._start;
      var i = 0;
      while (i !== size) {
        if (fn(value, reverse ? size - ++i : i++, this) === false) {
          break;
        }
        value += reverse ? -step : step;
      }
      return i;
    };

    Range.prototype.__iterator = function __iterator (type, reverse) {
      var size = this.size;
      var step = this._step;
      var value = reverse ? this._start + (size - 1) * step : this._start;
      var i = 0;
      return new Iterator(function () {
        if (i === size) {
          return iteratorDone();
        }
        var v = value;
        value += reverse ? -step : step;
        return iteratorValue(type, reverse ? size - ++i : i++, v);
      });
    };

    Range.prototype.equals = function equals (other) {
      return other instanceof Range
        ? this._start === other._start &&
            this._end === other._end &&
            this._step === other._step
        : deepEqual(this, other);
    };

    return Range;
  }(IndexedSeq));

  var EMPTY_RANGE;

  /**
   * Returns the value at the provided key path starting at the provided
   * collection, or notSetValue if the key path is not defined.
   *
   * A functional alternative to `collection.getIn(keypath)` which will also
   * work with plain Objects and Arrays.
   */
  function getIn$1(collection, searchKeyPath, notSetValue) {
      var keyPath = coerceKeyPath(searchKeyPath);
      var i = 0;
      while (i !== keyPath.length) {
          // @ts-expect-error keyPath[i++] can not be undefined by design
          collection = get(collection, keyPath[i++], NOT_SET);
          if (collection === NOT_SET) {
              return notSetValue;
          }
      }
      return collection;
  }

  function getIn(searchKeyPath, notSetValue) {
    return getIn$1(this, searchKeyPath, notSetValue);
  }

  /**
   * Returns true if the key path is defined in the provided collection.
   *
   * A functional alternative to `collection.hasIn(keypath)` which will also
   * work with plain Objects and Arrays.
   */
  function hasIn$1(collection, keyPath) {
      return getIn$1(collection, keyPath, NOT_SET) !== NOT_SET;
  }

  function hasIn(searchKeyPath) {
    return hasIn$1(this, searchKeyPath);
  }

  function toObject() {
    assertNotInfinite(this.size);
    var object = {};
    this.__iterate(function (v, k) {
      object[k] = v;
    });
    return object;
  }

  Collection.Iterator = Iterator;

  mixin(Collection, {
    // ### Conversion to other types

    toArray: function toArray() {
      assertNotInfinite(this.size);
      var array = new Array(this.size || 0);
      var useTuples = isKeyed(this);
      var i = 0;
      this.__iterate(function (v, k) {
        // Keyed collections produce an array of tuples.
        array[i++] = useTuples ? [k, v] : v;
      });
      return array;
    },

    toIndexedSeq: function toIndexedSeq() {
      return new ToIndexedSequence(this);
    },

    toJS: function toJS$1() {
      return toJS(this);
    },

    toKeyedSeq: function toKeyedSeq() {
      return new ToKeyedSequence(this, true);
    },

    toMap: function toMap() {
      // Use Late Binding here to solve the circular dependency.
      return Map$1(this.toKeyedSeq());
    },

    toObject: toObject,

    toOrderedMap: function toOrderedMap() {
      // Use Late Binding here to solve the circular dependency.
      return OrderedMap(this.toKeyedSeq());
    },

    toOrderedSet: function toOrderedSet() {
      // Use Late Binding here to solve the circular dependency.
      return OrderedSet(isKeyed(this) ? this.valueSeq() : this);
    },

    toSet: function toSet() {
      // Use Late Binding here to solve the circular dependency.
      return Set$1(isKeyed(this) ? this.valueSeq() : this);
    },

    toSetSeq: function toSetSeq() {
      return new ToSetSequence(this);
    },

    toSeq: function toSeq() {
      return isIndexed(this)
        ? this.toIndexedSeq()
        : isKeyed(this)
          ? this.toKeyedSeq()
          : this.toSetSeq();
    },

    toStack: function toStack() {
      // Use Late Binding here to solve the circular dependency.
      return Stack(isKeyed(this) ? this.valueSeq() : this);
    },

    toList: function toList() {
      // Use Late Binding here to solve the circular dependency.
      return List(isKeyed(this) ? this.valueSeq() : this);
    },

    // ### Common JavaScript methods and properties

    toString: function toString() {
      return '[Collection]';
    },

    __toString: function __toString(head, tail) {
      if (this.size === 0) {
        return head + tail;
      }
      return (
        head +
        ' ' +
        this.toSeq().map(this.__toStringMapper).join(', ') +
        ' ' +
        tail
      );
    },

    // ### ES6 Collection methods (ES6 Array and Map)

    concat: function concat() {
      var values = [], len = arguments.length;
      while ( len-- ) values[ len ] = arguments[ len ];

      return reify(this, concatFactory(this, values));
    },

    includes: function includes(searchValue) {
      return this.some(function (value) { return is(value, searchValue); });
    },

    entries: function entries() {
      return this.__iterator(ITERATE_ENTRIES);
    },

    every: function every(predicate, context) {
      assertNotInfinite(this.size);
      var returnValue = true;
      this.__iterate(function (v, k, c) {
        if (!predicate.call(context, v, k, c)) {
          returnValue = false;
          return false;
        }
      });
      return returnValue;
    },

    filter: function filter(predicate, context) {
      return reify(this, filterFactory(this, predicate, context, true));
    },

    partition: function partition(predicate, context) {
      return partitionFactory(this, predicate, context);
    },

    find: function find(predicate, context, notSetValue) {
      var entry = this.findEntry(predicate, context);
      return entry ? entry[1] : notSetValue;
    },

    forEach: function forEach(sideEffect, context) {
      assertNotInfinite(this.size);
      return this.__iterate(context ? sideEffect.bind(context) : sideEffect);
    },

    join: function join(separator) {
      assertNotInfinite(this.size);
      separator = separator !== undefined ? '' + separator : ',';
      var joined = '';
      var isFirst = true;
      this.__iterate(function (v) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
        isFirst ? (isFirst = false) : (joined += separator);
        joined += v !== null && v !== undefined ? v.toString() : '';
      });
      return joined;
    },

    keys: function keys() {
      return this.__iterator(ITERATE_KEYS);
    },

    map: function map(mapper, context) {
      return reify(this, mapFactory(this, mapper, context));
    },

    reduce: function reduce$1(reducer, initialReduction, context) {
      return reduce(
        this,
        reducer,
        initialReduction,
        context,
        arguments.length < 2,
        false
      );
    },

    reduceRight: function reduceRight(reducer, initialReduction, context) {
      return reduce(
        this,
        reducer,
        initialReduction,
        context,
        arguments.length < 2,
        true
      );
    },

    reverse: function reverse() {
      return reify(this, reverseFactory(this, true));
    },

    slice: function slice(begin, end) {
      return reify(this, sliceFactory(this, begin, end, true));
    },

    some: function some(predicate, context) {
      assertNotInfinite(this.size);
      var returnValue = false;
      this.__iterate(function (v, k, c) {
        if (predicate.call(context, v, k, c)) {
          returnValue = true;
          return false;
        }
      });
      return returnValue;
    },

    sort: function sort(comparator) {
      return reify(this, sortFactory(this, comparator));
    },

    values: function values() {
      return this.__iterator(ITERATE_VALUES);
    },

    // ### More sequential methods

    butLast: function butLast() {
      return this.slice(0, -1);
    },

    isEmpty: function isEmpty() {
      return this.size !== undefined ? this.size === 0 : !this.some(function () { return true; });
    },

    count: function count(predicate, context) {
      return ensureSize(
        predicate ? this.toSeq().filter(predicate, context) : this
      );
    },

    countBy: function countBy(grouper, context) {
      return countByFactory(this, grouper, context);
    },

    equals: function equals(other) {
      return deepEqual(this, other);
    },

    entrySeq: function entrySeq() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      var collection = this;
      if (collection._cache) {
        // We cache as an entries array, so we can just return the cache!
        return new ArraySeq(collection._cache);
      }
      var entriesSequence = collection.toSeq().map(entryMapper).toIndexedSeq();
      entriesSequence.fromEntrySeq = function () { return collection.toSeq(); };
      return entriesSequence;
    },

    filterNot: function filterNot(predicate, context) {
      return this.filter(not(predicate), context);
    },

    findEntry: function findEntry(predicate, context, notSetValue) {
      var found = notSetValue;
      this.__iterate(function (v, k, c) {
        if (predicate.call(context, v, k, c)) {
          found = [k, v];
          return false;
        }
      });
      return found;
    },

    findKey: function findKey(predicate, context) {
      var entry = this.findEntry(predicate, context);
      return entry && entry[0];
    },

    findLast: function findLast(predicate, context, notSetValue) {
      return this.toKeyedSeq().reverse().find(predicate, context, notSetValue);
    },

    findLastEntry: function findLastEntry(predicate, context, notSetValue) {
      return this.toKeyedSeq()
        .reverse()
        .findEntry(predicate, context, notSetValue);
    },

    findLastKey: function findLastKey(predicate, context) {
      return this.toKeyedSeq().reverse().findKey(predicate, context);
    },

    first: function first(notSetValue) {
      return this.find(returnTrue, null, notSetValue);
    },

    flatMap: function flatMap(mapper, context) {
      return reify(this, flatMapFactory(this, mapper, context));
    },

    flatten: function flatten(depth) {
      return reify(this, flattenFactory(this, depth, true));
    },

    fromEntrySeq: function fromEntrySeq() {
      return new FromEntriesSequence(this);
    },

    get: function get(searchKey, notSetValue) {
      return this.find(function (_, key) { return is(key, searchKey); }, undefined, notSetValue);
    },

    getIn: getIn,

    groupBy: function groupBy(grouper, context) {
      return groupByFactory(this, grouper, context);
    },

    has: function has(searchKey) {
      return this.get(searchKey, NOT_SET) !== NOT_SET;
    },

    hasIn: hasIn,

    isSubset: function isSubset(iter) {
      iter = typeof iter.includes === 'function' ? iter : Collection(iter);
      return this.every(function (value) { return iter.includes(value); });
    },

    isSuperset: function isSuperset(iter) {
      iter = typeof iter.isSubset === 'function' ? iter : Collection(iter);
      return iter.isSubset(this);
    },

    keyOf: function keyOf(searchValue) {
      return this.findKey(function (value) { return is(value, searchValue); });
    },

    keySeq: function keySeq() {
      return this.toSeq().map(keyMapper).toIndexedSeq();
    },

    last: function last(notSetValue) {
      return this.toSeq().reverse().first(notSetValue);
    },

    lastKeyOf: function lastKeyOf(searchValue) {
      return this.toKeyedSeq().reverse().keyOf(searchValue);
    },

    max: function max(comparator) {
      return maxFactory(this, comparator);
    },

    maxBy: function maxBy(mapper, comparator) {
      return maxFactory(this, comparator, mapper);
    },

    min: function min(comparator) {
      return maxFactory(
        this,
        comparator ? neg(comparator) : defaultNegComparator
      );
    },

    minBy: function minBy(mapper, comparator) {
      return maxFactory(
        this,
        comparator ? neg(comparator) : defaultNegComparator,
        mapper
      );
    },

    rest: function rest() {
      return this.slice(1);
    },

    skip: function skip(amount) {
      return amount === 0 ? this : this.slice(Math.max(0, amount));
    },

    skipLast: function skipLast(amount) {
      return amount === 0 ? this : this.slice(0, -Math.max(0, amount));
    },

    skipWhile: function skipWhile(predicate, context) {
      return reify(this, skipWhileFactory(this, predicate, context, true));
    },

    skipUntil: function skipUntil(predicate, context) {
      return this.skipWhile(not(predicate), context);
    },

    sortBy: function sortBy(mapper, comparator) {
      return reify(this, sortFactory(this, comparator, mapper));
    },

    take: function take(amount) {
      return this.slice(0, Math.max(0, amount));
    },

    takeLast: function takeLast(amount) {
      return this.slice(-Math.max(0, amount));
    },

    takeWhile: function takeWhile(predicate, context) {
      return reify(this, takeWhileFactory(this, predicate, context));
    },

    takeUntil: function takeUntil(predicate, context) {
      return this.takeWhile(not(predicate), context);
    },

    update: function update(fn) {
      return fn(this);
    },

    valueSeq: function valueSeq() {
      return this.toIndexedSeq();
    },

    // ### Hashable Object

    hashCode: function hashCode() {
      return this.__hash || (this.__hash = hashCollection(this));
    },

    // ### Internal

    // abstract __iterate(fn, reverse)

    // abstract __iterator(type, reverse)
  });

  var CollectionPrototype = Collection.prototype;
  CollectionPrototype[IS_COLLECTION_SYMBOL] = true;
  CollectionPrototype[ITERATOR_SYMBOL] = CollectionPrototype.values;
  CollectionPrototype.toJSON = CollectionPrototype.toArray;
  CollectionPrototype.__toStringMapper = quoteString;
  CollectionPrototype.inspect = CollectionPrototype.toSource = function () {
    return this.toString();
  };
  CollectionPrototype.chain = CollectionPrototype.flatMap;
  CollectionPrototype.contains = CollectionPrototype.includes;

  mixin(KeyedCollection, {
    // ### More sequential methods

    flip: function flip() {
      return reify(this, flipFactory(this));
    },

    mapEntries: function mapEntries(mapper, context) {
      var this$1$1 = this;

      var iterations = 0;
      return reify(
        this,
        this.toSeq()
          .map(function (v, k) { return mapper.call(context, [k, v], iterations++, this$1$1); })
          .fromEntrySeq()
      );
    },

    mapKeys: function mapKeys(mapper, context) {
      var this$1$1 = this;

      return reify(
        this,
        this.toSeq()
          .flip()
          .map(function (k, v) { return mapper.call(context, k, v, this$1$1); })
          .flip()
      );
    },
  });

  var KeyedCollectionPrototype = KeyedCollection.prototype;
  KeyedCollectionPrototype[IS_KEYED_SYMBOL] = true;
  KeyedCollectionPrototype[ITERATOR_SYMBOL] = CollectionPrototype.entries;
  KeyedCollectionPrototype.toJSON = toObject;
  KeyedCollectionPrototype.__toStringMapper = function (v, k) { return quoteString(k) + ': ' + quoteString(v); };

  mixin(IndexedCollection, {
    // ### Conversion to other types

    toKeyedSeq: function toKeyedSeq() {
      return new ToKeyedSequence(this, false);
    },

    // ### ES6 Collection methods (ES6 Array and Map)

    filter: function filter(predicate, context) {
      return reify(this, filterFactory(this, predicate, context, false));
    },

    findIndex: function findIndex(predicate, context) {
      var entry = this.findEntry(predicate, context);
      return entry ? entry[0] : -1;
    },

    indexOf: function indexOf(searchValue) {
      var key = this.keyOf(searchValue);
      return key === undefined ? -1 : key;
    },

    lastIndexOf: function lastIndexOf(searchValue) {
      var key = this.lastKeyOf(searchValue);
      return key === undefined ? -1 : key;
    },

    reverse: function reverse() {
      return reify(this, reverseFactory(this, false));
    },

    slice: function slice(begin, end) {
      return reify(this, sliceFactory(this, begin, end, false));
    },

    splice: function splice(index, removeNum /*, ...values*/) {
      var numArgs = arguments.length;
      removeNum = Math.max(removeNum || 0, 0);
      if (numArgs === 0 || (numArgs === 2 && !removeNum)) {
        return this;
      }
      // If index is negative, it should resolve relative to the size of the
      // collection. However size may be expensive to compute if not cached, so
      // only call count() if the number is in fact negative.
      index = resolveBegin(index, index < 0 ? this.count() : this.size);
      var spliced = this.slice(0, index);
      return reify(
        this,
        numArgs === 1
          ? spliced
          : spliced.concat(arrCopy(arguments, 2), this.slice(index + removeNum))
      );
    },

    // ### More collection methods

    findLastIndex: function findLastIndex(predicate, context) {
      var entry = this.findLastEntry(predicate, context);
      return entry ? entry[0] : -1;
    },

    first: function first(notSetValue) {
      return this.get(0, notSetValue);
    },

    flatten: function flatten(depth) {
      return reify(this, flattenFactory(this, depth, false));
    },

    get: function get(index, notSetValue) {
      index = wrapIndex(this, index);
      return index < 0 ||
        this.size === Infinity ||
        (this.size !== undefined && index > this.size)
        ? notSetValue
        : this.find(function (_, key) { return key === index; }, undefined, notSetValue);
    },

    has: function has(index) {
      index = wrapIndex(this, index);
      return (
        index >= 0 &&
        (this.size !== undefined
          ? this.size === Infinity || index < this.size
          : this.indexOf(index) !== -1)
      );
    },

    interpose: function interpose(separator) {
      return reify(this, interposeFactory(this, separator));
    },

    interleave: function interleave(/*...collections*/) {
      var collections = [this].concat(arrCopy(arguments));
      var zipped = zipWithFactory(this.toSeq(), IndexedSeq.of, collections);
      var interleaved = zipped.flatten(true);
      if (zipped.size) {
        interleaved.size = zipped.size * collections.length;
      }
      return reify(this, interleaved);
    },

    keySeq: function keySeq() {
      return Range(0, this.size);
    },

    last: function last(notSetValue) {
      return this.get(-1, notSetValue);
    },

    skipWhile: function skipWhile(predicate, context) {
      return reify(this, skipWhileFactory(this, predicate, context, false));
    },

    zip: function zip(/*, ...collections */) {
      var collections = [this].concat(arrCopy(arguments));
      return reify(this, zipWithFactory(this, defaultZipper, collections));
    },

    zipAll: function zipAll(/*, ...collections */) {
      var collections = [this].concat(arrCopy(arguments));
      return reify(this, zipWithFactory(this, defaultZipper, collections, true));
    },

    zipWith: function zipWith(zipper /*, ...collections */) {
      var collections = arrCopy(arguments);
      collections[0] = this;
      return reify(this, zipWithFactory(this, zipper, collections));
    },
  });

  var IndexedCollectionPrototype = IndexedCollection.prototype;
  IndexedCollectionPrototype[IS_INDEXED_SYMBOL] = true;
  IndexedCollectionPrototype[IS_ORDERED_SYMBOL] = true;

  mixin(SetCollection, {
    // ### ES6 Collection methods (ES6 Array and Map)

    get: function get(value, notSetValue) {
      return this.has(value) ? value : notSetValue;
    },

    includes: function includes(value) {
      return this.has(value);
    },

    // ### More sequential methods

    keySeq: function keySeq() {
      return this.valueSeq();
    },
  });

  var SetCollectionPrototype = SetCollection.prototype;
  SetCollectionPrototype.has = CollectionPrototype.includes;
  SetCollectionPrototype.contains = SetCollectionPrototype.includes;
  SetCollectionPrototype.keys = SetCollectionPrototype.values;

  // Mixin subclasses

  mixin(KeyedSeq, KeyedCollectionPrototype);
  mixin(IndexedSeq, IndexedCollectionPrototype);
  mixin(SetSeq, SetCollectionPrototype);

  // #pragma Helper functions

  function reduce(collection, reducer, reduction, context, useFirst, reverse) {
    assertNotInfinite(collection.size);
    collection.__iterate(function (v, k, c) {
      if (useFirst) {
        useFirst = false;
        reduction = v;
      } else {
        reduction = reducer.call(context, reduction, v, k, c);
      }
    }, reverse);
    return reduction;
  }

  function keyMapper(v, k) {
    return k;
  }

  function entryMapper(v, k) {
    return [k, v];
  }

  function not(predicate) {
    return function () {
      return !predicate.apply(this, arguments);
    };
  }

  function neg(predicate) {
    return function () {
      return -predicate.apply(this, arguments);
    };
  }

  function defaultZipper() {
    return arrCopy(arguments);
  }

  function defaultNegComparator(a, b) {
    return a < b ? 1 : a > b ? -1 : 0;
  }

  function hashCollection(collection) {
    if (collection.size === Infinity) {
      return 0;
    }
    var ordered = isOrdered(collection);
    var keyed = isKeyed(collection);
    var h = ordered ? 1 : 0;

    collection.__iterate(
      keyed
        ? ordered
          ? function (v, k) {
              h = (31 * h + hashMerge(hash(v), hash(k))) | 0;
            }
          : function (v, k) {
              h = (h + hashMerge(hash(v), hash(k))) | 0;
            }
        : ordered
          ? function (v) {
              h = (31 * h + hash(v)) | 0;
            }
          : function (v) {
              h = (h + hash(v)) | 0;
            }
    );

    return murmurHashOfSize(collection.size, h);
  }

  function murmurHashOfSize(size, h) {
    h = imul(h, 0xcc9e2d51);
    h = imul((h << 15) | (h >>> -15), 0x1b873593);
    h = imul((h << 13) | (h >>> -13), 5);
    h = ((h + 0xe6546b64) | 0) ^ size;
    h = imul(h ^ (h >>> 16), 0x85ebca6b);
    h = imul(h ^ (h >>> 13), 0xc2b2ae35);
    h = smi(h ^ (h >>> 16));
    return h;
  }

  function hashMerge(a, b) {
    return (a ^ (b + 0x9e3779b9 + (a << 6) + (a >> 2))) | 0; // int
  }

  var OrderedSet = /*@__PURE__*/(function (Set) {
    function OrderedSet(value) {
      // eslint-disable-next-line no-constructor-return
      return value === undefined || value === null
        ? emptyOrderedSet()
        : isOrderedSet(value)
          ? value
          : emptyOrderedSet().withMutations(function (set) {
              var iter = SetCollection(value);
              assertNotInfinite(iter.size);
              iter.forEach(function (v) { return set.add(v); });
            });
    }

    if ( Set ) OrderedSet.__proto__ = Set;
    OrderedSet.prototype = Object.create( Set && Set.prototype );
    OrderedSet.prototype.constructor = OrderedSet;

    OrderedSet.of = function of (/*...values*/) {
      return this(arguments);
    };

    OrderedSet.fromKeys = function fromKeys (value) {
      return this(KeyedCollection(value).keySeq());
    };

    OrderedSet.prototype.toString = function toString () {
      return this.__toString('OrderedSet {', '}');
    };

    return OrderedSet;
  }(Set$1));

  OrderedSet.isOrderedSet = isOrderedSet;

  var OrderedSetPrototype = OrderedSet.prototype;
  OrderedSetPrototype[IS_ORDERED_SYMBOL] = true;
  OrderedSetPrototype.zip = IndexedCollectionPrototype.zip;
  OrderedSetPrototype.zipWith = IndexedCollectionPrototype.zipWith;
  OrderedSetPrototype.zipAll = IndexedCollectionPrototype.zipAll;

  OrderedSetPrototype.__empty = emptyOrderedSet;
  OrderedSetPrototype.__make = makeOrderedSet;

  function makeOrderedSet(map, ownerID) {
    var set = Object.create(OrderedSetPrototype);
    set.size = map ? map.size : 0;
    set._map = map;
    set.__ownerID = ownerID;
    return set;
  }

  var EMPTY_ORDERED_SET;
  function emptyOrderedSet() {
    return (
      EMPTY_ORDERED_SET || (EMPTY_ORDERED_SET = makeOrderedSet(emptyOrderedMap()))
    );
  }

  function throwOnInvalidDefaultValues(defaultValues) {
    if (isRecord(defaultValues)) {
      throw new Error(
        'Can not call `Record` with an immutable Record as default values. Use a plain javascript object instead.'
      );
    }

    if (isImmutable(defaultValues)) {
      throw new Error(
        'Can not call `Record` with an immutable Collection as default values. Use a plain javascript object instead.'
      );
    }

    if (defaultValues === null || typeof defaultValues !== 'object') {
      throw new Error(
        'Can not call `Record` with a non-object as default values. Use a plain javascript object instead.'
      );
    }
  }

  var Record = function Record(defaultValues, name) {
    var hasInitialized;

    throwOnInvalidDefaultValues(defaultValues);

    var RecordType = function Record(values) {
      var this$1$1 = this;

      if (values instanceof RecordType) {
        return values;
      }
      if (!(this instanceof RecordType)) {
        return new RecordType(values);
      }
      if (!hasInitialized) {
        hasInitialized = true;
        var keys = Object.keys(defaultValues);
        var indices = (RecordTypePrototype._indices = {});
        // Deprecated: left to attempt not to break any external code which
        // relies on a ._name property existing on record instances.
        // Use Record.getDescriptiveName() instead
        RecordTypePrototype._name = name;
        RecordTypePrototype._keys = keys;
        RecordTypePrototype._defaultValues = defaultValues;
        for (var i = 0; i < keys.length; i++) {
          var propName = keys[i];
          indices[propName] = i;
          if (RecordTypePrototype[propName]) {
            /* eslint-disable no-console */
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- TODO enable eslint here
            typeof console === 'object' &&
              console.warn &&
              console.warn(
                'Cannot define ' +
                  recordName(this) +
                  ' with property "' +
                  propName +
                  '" since that property name is part of the Record API.'
              );
            /* eslint-enable no-console */
          } else {
            setProp(RecordTypePrototype, propName);
          }
        }
      }
      this.__ownerID = undefined;
      this._values = List().withMutations(function (l) {
        l.setSize(this$1$1._keys.length);
        KeyedCollection(values).forEach(function (v, k) {
          l.set(this$1$1._indices[k], v === this$1$1._defaultValues[k] ? undefined : v);
        });
      });
      return this;
    };

    var RecordTypePrototype = (RecordType.prototype =
      Object.create(RecordPrototype));
    RecordTypePrototype.constructor = RecordType;

    if (name) {
      RecordType.displayName = name;
    }

    // eslint-disable-next-line no-constructor-return
    return RecordType;
  };

  Record.prototype.toString = function toString () {
    var str = recordName(this) + ' { ';
    var keys = this._keys;
    var k;
    for (var i = 0, l = keys.length; i !== l; i++) {
      k = keys[i];
      str += (i ? ', ' : '') + k + ': ' + quoteString(this.get(k));
    }
    return str + ' }';
  };

  Record.prototype.equals = function equals (other) {
    return (
      this === other ||
      (isRecord(other) && recordSeq(this).equals(recordSeq(other)))
    );
  };

  Record.prototype.hashCode = function hashCode () {
    return recordSeq(this).hashCode();
  };

  // @pragma Access

  Record.prototype.has = function has (k) {
    return this._indices.hasOwnProperty(k);
  };

  Record.prototype.get = function get (k, notSetValue) {
    if (!this.has(k)) {
      return notSetValue;
    }
    var index = this._indices[k];
    var value = this._values.get(index);
    return value === undefined ? this._defaultValues[k] : value;
  };

  // @pragma Modification

  Record.prototype.set = function set (k, v) {
    if (this.has(k)) {
      var newValues = this._values.set(
        this._indices[k],
        v === this._defaultValues[k] ? undefined : v
      );
      if (newValues !== this._values && !this.__ownerID) {
        return makeRecord(this, newValues);
      }
    }
    return this;
  };

  Record.prototype.remove = function remove (k) {
    return this.set(k);
  };

  Record.prototype.clear = function clear () {
    var newValues = this._values.clear().setSize(this._keys.length);

    return this.__ownerID ? this : makeRecord(this, newValues);
  };

  Record.prototype.wasAltered = function wasAltered () {
    return this._values.wasAltered();
  };

  Record.prototype.toSeq = function toSeq () {
    return recordSeq(this);
  };

  Record.prototype.toJS = function toJS$1 () {
    return toJS(this);
  };

  Record.prototype.entries = function entries () {
    return this.__iterator(ITERATE_ENTRIES);
  };

  Record.prototype.__iterator = function __iterator (type, reverse) {
    return recordSeq(this).__iterator(type, reverse);
  };

  Record.prototype.__iterate = function __iterate (fn, reverse) {
    return recordSeq(this).__iterate(fn, reverse);
  };

  Record.prototype.__ensureOwner = function __ensureOwner (ownerID) {
    if (ownerID === this.__ownerID) {
      return this;
    }
    var newValues = this._values.__ensureOwner(ownerID);
    if (!ownerID) {
      this.__ownerID = ownerID;
      this._values = newValues;
      return this;
    }
    return makeRecord(this, newValues, ownerID);
  };

  Record.isRecord = isRecord;
  Record.getDescriptiveName = recordName;
  var RecordPrototype = Record.prototype;
  RecordPrototype[IS_RECORD_SYMBOL] = true;
  RecordPrototype[DELETE] = RecordPrototype.remove;
  RecordPrototype.deleteIn = RecordPrototype.removeIn = deleteIn;
  RecordPrototype.getIn = getIn;
  RecordPrototype.hasIn = CollectionPrototype.hasIn;
  RecordPrototype.merge = merge$1;
  RecordPrototype.mergeWith = mergeWith$1;
  RecordPrototype.mergeIn = mergeIn;
  RecordPrototype.mergeDeep = mergeDeep;
  RecordPrototype.mergeDeepWith = mergeDeepWith;
  RecordPrototype.mergeDeepIn = mergeDeepIn;
  RecordPrototype.setIn = setIn;
  RecordPrototype.update = update;
  RecordPrototype.updateIn = updateIn;
  RecordPrototype.withMutations = withMutations;
  RecordPrototype.asMutable = asMutable;
  RecordPrototype.asImmutable = asImmutable;
  RecordPrototype[ITERATOR_SYMBOL] = RecordPrototype.entries;
  RecordPrototype.toJSON = RecordPrototype.toObject =
    CollectionPrototype.toObject;
  RecordPrototype.inspect = RecordPrototype.toSource = function () {
    return this.toString();
  };

  function makeRecord(likeRecord, values, ownerID) {
    var record = Object.create(Object.getPrototypeOf(likeRecord));
    record._values = values;
    record.__ownerID = ownerID;
    return record;
  }

  function recordName(record) {
    return record.constructor.displayName || record.constructor.name || 'Record';
  }

  function recordSeq(record) {
    return keyedSeqFromValue(record._keys.map(function (k) { return [k, record.get(k)]; }));
  }

  function setProp(prototype, name) {
    try {
      Object.defineProperty(prototype, name, {
        get: function () {
          return this.get(name);
        },
        set: function (value) {
          invariant(this.__ownerID, 'Cannot set on an immutable record.');
          this.set(name, value);
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO enable eslint here
    } catch (error) {
      // Object.defineProperty failed. Probably IE8.
    }
  }

  const u=null,{min:a,max:h,abs:v,floor:p}=Math,m=(e,t,n)=>a(n,h(t,e)),g=e=>[...e].sort(((e,t)=>e-t)),_="function"==typeof queueMicrotask?queueMicrotask:e=>{Promise.resolve().then(e);},w=e=>{let t;return ()=>(e&&(t=e(),e=void 0),t)},S=-1,$=(e,t,n)=>{const o=n?"unshift":"push";for(let n=0;n<t;n++)e[o](S);return e},y=(e,t)=>{const n=e.t[t];return n===S?e.o:n},x=(e,t,n)=>{const o=e.t[t]===S;return e.t[t]=n,e.i=a(t,e.i),o},b=(e,t)=>{if(!e.l)return 0;if(e.i>=t)return e.u[t];e.i<0&&(e.u[0]=0,e.i=0);let n=e.i,o=e.u[n];for(;n<t;)o+=y(e,n),e.u[++n]=o;return e.i=t,o},I=(e,t,n=0,o=e.l-1)=>{for(;n<=o;){const r=p((n+o)/2),i=b(e,r);if(i<=t){if(i+y(e,r)>t)return r;n=r+1;}else o=r-1;}return m(n,0,e.l-1)},z=(e,t,n)=>{const o=t-e.l;return e.i=n?-1:a(t-1,e.i),e.l=t,o>0?($(e.u,o),$(e.t,o,n),e.o*o):(e.u.splice(o),(n?e.t.splice(0,-o):e.t.splice(o)).reduce(((t,n)=>t-(n===S?e.o:n)),0))},k="undefined"!=typeof window,R=()=>document.documentElement,T=e=>e.ownerDocument,E=e=>e.defaultView,M=/*#__PURE__*/w((()=>!!k&&"rtl"===getComputedStyle(R()).direction)),C=/*#__PURE__*/w((()=>/iP(hone|od|ad)/.test(navigator.userAgent))),H=/*#__PURE__*/w((()=>"scrollBehavior"in R().style)),W=e=>h(e.h(),e.v()),O=e=>!!e.v(),B=(e,t=40,n=4,o=0,r,i=!1)=>{let s=!!o,l=1,c=0,f=0,d=0,p=0,m=0,_=0,w=0,k=0,R=s?[0,h(o-1,0)]:u,T=[0,0],E=0;const M=((e,t,n)=>({o:n?n[1]:t,t:n&&n[0]?$(n[0].slice(0,a(e,n[0].length)),h(0,e-n[0].length)):$([],e),l:e,i:-1,u:$([],e)}))(e,t,r),H=new Set,W=()=>d-f,O=()=>W()+m+p,B=e=>((e,t,n,o)=>{if(o=a(o,e.l-1),b(e,o)<=t){const r=I(e,t+n,o);return [I(e,t,o,r),r]}{const r=I(e,t,void 0,o);return [r,I(e,t+n,r)]}})(M,e,c,T[0]),J=()=>(e=>e.l?b(e,e.l-1)+y(e,e.l-1):0)(M),L=e=>b(M,e)-m,P=e=>y(M,e),A=e=>{e&&(C()&&0!==w?m+=e:p+=e);};return {p:()=>l,m:()=>(e=>[e.t.slice(),e.o])(M),_:()=>{let e,t;return _?[e,t]=T:([e,t]=T=B(h(0,O())),R&&(e=a(e,R[0]),t=h(t,R[1]))),1!==w&&(e-=h(0,n)),2!==w&&(t+=h(0,n)),[h(e,0),a(t,M.l-1)]},S:()=>I(M,O()),$:()=>I(M,O()+c),I:e=>M.t[e]===S,k:()=>!!R&&M.t.slice(h(0,R[0]-1),a(M.l-1,R[1]+1)+1).includes(S),R:L,T:P,M:()=>M.l,C:()=>d,H:()=>0!==w,v:()=>c,W:()=>f,h:J,O:()=>(_=p,p=0,[_,2===k||W()+c>=J()]),B:(e,t)=>{const n=[e,t];return H.add(n),()=>{H.delete(n);}},J:(e,t)=>{let n,o,r=0;switch(e){case 1:{const e=_;_=0;const n=t-d,i=v(n);e&&i<v(e)+1||0!==k||(w=n<0?2:1),s&&(R=u,s=!1),d=t,r=4;const l=W();l>=-c&&l<=J()&&(r+=1,o=i>c);break}case 2:r=8,0!==w&&(n=!0,r+=1),w=0,k=0,R=u;break;case 3:{const e=t.filter((([e,t])=>M.t[e]!==t));if(!e.length)break;A(e.reduce(((e,[t,n])=>((2===k||(R?!s&&t<R[0]:L(t)+(0===w&&0===k?P(t):0)<W()))&&(e+=n-P(t)),e)),0));for(const[t,n]of e){const e=P(t),o=x(M,t,n);i&&(E+=o?n:n-e);}i&&c&&E>c&&(A(((e,t)=>{let n=0;const o=[];e.t.forEach(((e,r)=>{e!==S&&(o.push(e),r<t&&n++);})),e.i=-1;const r=g(o),i=r.length,s=i/2|0,l=i%2==0?(r[s-1]+r[s])/2:r[s],c=e.o;return ((e.o=l)-c)*h(t-n,0)})(M,I(M,O()))),i=!1),r=3,o=!0;break}case 4:c!==t&&(c=t,r=3);break;case 5:t[1]?(A(z(M,t[0],!0)),k=2,r=1):(z(M,t[0]),r=1);break;case 6:f=t;break;case 7:k=1;break;case 8:R=B(t),r=1;}r&&(l=1+(2147483647&l),n&&m&&(p+=m,m=0),H.forEach((([e,t])=>{r&e&&t(o);})));}}},J=setTimeout,L=(e,t)=>t&&M()?-e:e,P=(e,t,n,o,r,i)=>{const s=Date.now;let l=0,c=!1,f=!1,d=!1,a=!1;const h=(()=>{let t;const n=()=>{t!=u&&clearTimeout(t);},o=()=>{n(),t=J((()=>{t=u,(()=>{if(c||f)return c=!1,void h();d=!1,e.J(2);})();}),150);};return o.L=n,o})(),v=()=>{l=s(),d&&(a=!0),i&&e.J(6,i()),e.J(1,o()),h();},p=t=>{if(c||!e.H()||t.ctrlKey)return;const o=s()-l;150>o&&50<o&&(n?t.deltaX:t.deltaY)&&(c=!0);},m=()=>{f=!0,d=a=!1;},g=()=>{f=!1,C()&&(d=!0);};return t.addEventListener("scroll",v),t.addEventListener("wheel",p,{passive:!0}),t.addEventListener("touchstart",m,{passive:!0}),t.addEventListener("touchend",g,{passive:!0}),{P:()=>{t.removeEventListener("scroll",v),t.removeEventListener("wheel",p),t.removeEventListener("touchstart",m),t.removeEventListener("touchend",g),h.L();},A:()=>{const[t,i]=e.O();t&&(r(L(t,n),i,a),a=!1,i&&e.v()>e.h()&&e.J(1,o()));}}},A=(e,t)=>{let n,o,r;const i=t?"scrollLeft":"scrollTop",s=t?"overflowX":"overflowY",l=async(o,s)=>{if(!n)return void _((()=>l(o,s)));r&&r();const c=()=>{let t;return [new Promise(((n,o)=>{t=n,r=o,O(e)&&J(o,150);})),e.B(2,(()=>{t&&t();}))]};if(s&&H()){for(;e.J(8,o()),e.k();){const[e,t]=c();try{await e;}catch(e){return}finally{t();}}n.scrollTo({[t?"left":"top"]:L(o(),t),behavior:"smooth"});}else for(;;){const[r,s]=c();try{n[i]=L(o(),t),e.J(7),await r;}catch(e){return}finally{s();}}};return {D(l){n=l,o=P(e,l,t,(()=>L(l[i],t)),((t,n,o)=>{if(o){const e=l.style,t=e[s];e[s]="hidden",J((()=>{e[s]=t;}));}n?(l[i]=e.C()+t,r&&r()):l[i]+=t;}));},V(){o&&o.P();},X(e){l((()=>e));},Y(t){t+=e.C(),l((()=>t));},j(t,{align:n,smooth:o,offset:r=0}={}){if(t=m(t,0,e.M()-1),"nearest"===n){const o=e.R(t),r=e.C();if(o<r)n="start";else {if(!(o+e.T(t)>r+e.v()))return;n="end";}}l((()=>r+e.W()+e.R(t)+("end"===n?e.T(t)-e.v():"center"===n?(e.T(t)-e.v())/2:0)),o);},q:()=>{o&&o.A();}}},X=e=>{let t;return {U(n){(t||(t=new(E(T(n)).ResizeObserver)(e))).observe(n);},F(e){t.unobserve(e);},P(){t&&t.disconnect();}}},Y=(e,t)=>{let n;const o=t?"width":"height",r=new WeakMap,i=X((t=>{const i=[];for(const{target:s,contentRect:l}of t)if(s.offsetParent)if(s===n)e.J(4,l[o]);else {const e=r.get(s);e!=u&&i.push([e,l[o]]);}i.length&&e.J(3,i);}));return {G(e){i.U(n=e);},K:(e,t)=>(r.set(e,t),i.U(e),()=>{r.delete(e),i.F(e);}),V:i.P}},U=k?React.useLayoutEffect:React.useEffect,F="current",G=(e,t)=>{if(Array.isArray(e))for(const n of e)G(n,t);else null==e||"boolean"==typeof e||t.push(e);},K=(e,t)=>{const n=e.key;return null!=n?n:"_"+t},N=e=>{const t=React.useRef();return t[F]||(t[F]=e())},Q=e=>{const t=React.useRef(e);return U((()=>{t[F]=e;}),[e]),t},Z=/*#__PURE__*/React.memo((({N:t,Z:n,ee:r,te:s,ne:l,oe:c,re:f,ie:d})=>{const u=React.useRef(null);U((()=>n(u[F],r)),[r]);const a=React.useMemo((()=>{const e={position:l&&d?void 0:"absolute",[f?"height":"width"]:"100%",[f?"top":"left"]:0,[f?M()?"right":"left":"top"]:s,visibility:!l||d?"visible":"hidden"};return f&&(e.display="flex"),e}),[s,l,d,f]);return jsxRuntime.jsx(c,"string"==typeof c?{ref:u,style:a,children:t}:{ref:u,style:a,index:r,children:t})})),ee=(e,t)=>React.useMemo((()=>{if("function"==typeof e)return [e,t||0];const n=(e=>{const t=[];return G(e,t),t})(e);return [e=>n[e],n.length]}),[e,t]),te=/*#__PURE__*/React.forwardRef((({children:t,count:n,overscan:r,itemSize:i,shift:s,horizontal:f,keepMounted:u,cache:a,startMargin:h=0,ssrCount:v,as:p="div",item:m="div",scrollRef:w,onScroll:S,onScrollEnd:$},y)=>{const[x,b]=ee(t,n),I=React.useRef(null),z=React.useRef(!!v),k=Q(S),R=Q($),[T,E,M,C]=N((()=>{const e=!!f,t=B(b,i,r,v,a,!i);return [t,Y(t,e),A(t,e),e]}));b!==T.M()&&T.J(5,[b,s]),h!==T.W()&&T.J(6,h);const[H,O]=React.useReducer(T.p,void 0,T.p),[J,L]=T._(),P=T.H(),D=T.h(),V=[],X=t=>{const n=x(t);return jsxRuntime.jsx(Z,{Z:E.K,ee:t,te:T.R(t),ne:T.I(t),oe:m,N:n,re:C,ie:z[F]},K(n,t))};U((()=>{z[F]=!1;const e=T.B(1,(e=>{e?reactDom.flushSync(O):O();})),t=T.B(4,(()=>{k[F]&&k[F](T.C());})),n=T.B(8,(()=>{R[F]&&R[F]();})),o=e=>{E.G(e),M.D(e);};return w?_((()=>o(w[F]))):o(I[F].parentElement),()=>{e(),t(),n(),E.V(),M.V();}}),[]),U((()=>{M.q();}),[H]),React.useImperativeHandle(y,(()=>({get cache(){return T.m()},get scrollOffset(){return T.C()},get scrollSize(){return W(T)},get viewportSize(){return T.v()},findStartIndex:T.S,findEndIndex:T.$,getItemOffset:T.R,getItemSize:T.T,scrollToIndex:M.j,scrollTo:M.X,scrollBy:M.Y})),[]);for(let e=J,t=L;e<=t;e++)V.push(X(e));if(u){const e=[],t=[];g(u).forEach((n=>{n<J&&e.push(X(n)),n>L&&t.push(X(n));})),V.unshift(...e),V.push(...t);}return jsxRuntime.jsx(p,{ref:I,style:{overflowAnchor:"none",flex:"none",position:"relative",visibility:"hidden",width:C?D:"100%",height:C?"100%":D,pointerEvents:P?"none":void 0},children:V})})),ne=/*#__PURE__*/React.forwardRef((({children:t,count:n,overscan:r,itemSize:i,shift:s,horizontal:l,keepMounted:c,reverse:f,cache:d,ssrCount:u,item:a,onScroll:h,onScrollEnd:v,style:p,...m},g)=>{const _=React.useRef(null),w=f&&!l;let S=jsxRuntime.jsx(te,{ref:g,scrollRef:w?_:void 0,count:n,overscan:r,itemSize:i,shift:s,horizontal:l,keepMounted:c,cache:d,ssrCount:u,item:a,onScroll:h,onScrollEnd:v,children:t});return w&&(S=jsxRuntime.jsx("div",{style:{visibility:"hidden",display:"flex",flexDirection:"column",justifyContent:"flex-end",minHeight:"100%"},children:S})),jsxRuntime.jsx("div",{ref:_,...m,style:{display:l?"inline-block":"block",[l?"overflowX":"overflowY"]:"auto",contain:"strict",width:"100%",height:"100%",...p},children:S})}));

  function styleInject(css, ref) {
    if ( ref === void 0 ) ref = {};
    var insertAt = ref.insertAt;

    if (!css || typeof document === 'undefined') { return; }

    var head = document.head || document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.type = 'text/css';

    if (insertAt === 'top') {
      if (head.firstChild) {
        head.insertBefore(style, head.firstChild);
      } else {
        head.appendChild(style);
      }
    } else {
      head.appendChild(style);
    }

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
  }

  var css_248z$a = ".index-module_bold__Mynkh { font-weight: bold; }\n.index-module_underline__Wil2O { text-decoration: underline; }\n.index-module_italic__FHDKu { font-style: italic; }\n\n.index-module_wrapLine__ATECR {\n    white-space: normal;\n    text-indent: 0;\n    display: inline-block;\n}\n\n.index-module_noWrapLine__mnBfu {\n    display: ruby;\n}\n\n.index-module_black__wgdzU { color: #4e4e4e; }\n.index-module_red__ZGVwG { color: #ff6c60; }\n.index-module_green__W5glx { color: #00aa00; }\n.index-module_yellow__7ZHva { color: #ffffb6; }\n.index-module_blue__TYDek { color: #96cbfe; }\n.index-module_magenta__11M24 { color: #ff73fd; }\n.index-module_cyan__gRFzP { color: #00aaaa; }\n.index-module_white__X0NFz { color: #eeeeee; }\n.index-module_grey__E3Gez { color: #969696; }\n\n.index-module_blackBold__FWW5K { color: #7c7c7c; }\n.index-module_redBold__7N94D { color: #ff9b93; }\n.index-module_greenBold__rsBvm { color: #ceffab }\n.index-module_yellowBold__XSM-U { color: #ffffcb; }\n.index-module_blueBold__phud4 { color: #b5dcfe; }\n.index-module_magentaBold__Sxjkx { color: #ff9cfe; }\n.index-module_cyanBold__Zp8db { color: #55ffff; }\n.index-module_whiteBold__r8lJg { color: #ffffff; }\n.index-module_greyBold__YXSoC { color: #969696; }\n\n.index-module_blackBg__c03y4 { background-color: #4e4e4e; }\n.index-module_redBg__SE7xH { background-color: #ff6c60; }\n.index-module_greenBg__XfHR2 { background-color: #00aa00; }\n.index-module_yellowBg__U-Aea { background-color: #ffffb6; }\n.index-module_blueBg__nRj7n { background-color: #96cbfe; }\n.index-module_magentaBg__ICQ64 { background-color: #ff73fd; }\n.index-module_cyanBg__I5MZ5 { background-color: #00aaaa; }\n.index-module_whiteBg__AsxTO { background-color: #eeeeee; }\n.index-module_greyBg__wAYhU { background-color: #969696; }\n";
  var styles$b = {"bold":"index-module_bold__Mynkh","underline":"index-module_underline__Wil2O","italic":"index-module_italic__FHDKu","wrapLine":"index-module_wrapLine__ATECR","noWrapLine":"index-module_noWrapLine__mnBfu","black":"index-module_black__wgdzU","red":"index-module_red__ZGVwG","green":"index-module_green__W5glx","yellow":"index-module_yellow__7ZHva","blue":"index-module_blue__TYDek","magenta":"index-module_magenta__11M24","cyan":"index-module_cyan__gRFzP","white":"index-module_white__X0NFz","grey":"index-module_grey__E3Gez","blackBold":"index-module_blackBold__FWW5K","redBold":"index-module_redBold__7N94D","greenBold":"index-module_greenBold__rsBvm","yellowBold":"index-module_yellowBold__XSM-U","blueBold":"index-module_blueBold__phud4","magentaBold":"index-module_magentaBold__Sxjkx","cyanBold":"index-module_cyanBold__Zp8db","whiteBold":"index-module_whiteBold__r8lJg","greyBold":"index-module_greyBold__YXSoC","blackBg":"index-module_blackBg__c03y4","redBg":"index-module_redBg__SE7xH","greenBg":"index-module_greenBg__XfHR2","yellowBg":"index-module_yellowBg__U-Aea","blueBg":"index-module_blueBg__nRj7n","magentaBg":"index-module_magentaBg__ICQ64","cyanBg":"index-module_cyanBg__I5MZ5","whiteBg":"index-module_whiteBg__AsxTO","greyBg":"index-module_greyBg__wAYhU"};
  styleInject(css_248z$a);

  const getClassName = (part, wrapLines) => {
      const className = ["log-part"];
      if (part.foreground && part.bold) {
          className.push(styles$b[`${part.foreground}Bold`], styles$b.bold);
      }
      else if (part.foreground) {
          className.push(styles$b[part.foreground]);
      }
      else if (part.bold) {
          className.push(styles$b.bold);
      }
      if (wrapLines) {
          className.push(styles$b.wrapLine);
      }
      else {
          className.push(styles$b.noWrapLine);
      }
      if (part.background) {
          className.push(styles$b[`${part.background}Bg`]);
      }
      if (part.italic) {
          className.push(styles$b.italic);
      }
      if (part.underline) {
          className.push(styles$b.underline);
      }
      return className.join(" ");
  };
  /**
   * An individual segment of text within a line. When the text content
   * is ANSI-parsed, each boundary is placed within its own `LinePart`
   * and styled separately (colors, text formatting, etc.) from the
   * rest of the line's content.
   */
  class LinePart extends React.Component {
      render() {
          const { format, part, style } = this.props;
          const partText = part.text;
          const partClassName = getClassName(part, !!this.props.wrapLines);
          const renderedText = format ? format(partText) : partText;
          if (this.props.enableLinks) {
              if (part.link) {
                  return (React__default["default"].createElement("span", null,
                      React__default["default"].createElement("a", { className: partClassName, href: partText, target: "_blank", rel: "noopener noreferrer" }, renderedText),
                      " "));
              }
              if (part.email) {
                  return (React__default["default"].createElement("span", null,
                      React__default["default"].createElement("a", { className: partClassName, href: `mailto:${partText}` }, renderedText),
                      " "));
              }
          }
          return (React__default["default"].createElement("span", { className: partClassName, style: style },
              renderedText,
              this.props.enableLinks ? " " : null));
      }
  }
  LinePart.defaultProps = {
      format: null,
      style: null,
      enableLinks: false,
      wrapLines: false,
  };

  var css_248z$9 = ".index-module_lineContent__v3zqf {\n  user-select: initial;\n}\n";
  var styles$a = {"lineContent":"index-module_lineContent__v3zqf"};
  styleInject(css_248z$9);

  /**
   * The container of all the individual pieces of content that
   * is on a single line. May contain one or more `LinePart`s
   * depending on ANSI parsing.
   */
  class LineContent extends React.Component {
      render() {
          const { data, formatPart, onClick, number, style } = this.props;
          if (data) {
              const last = data[data.length - 1];
              if (last &&
                  typeof last.text === "string" &&
                  !last.text.endsWith("\n")) {
                  last.text += "\n";
              }
          }
          return (React__default["default"].createElement("span", { className: `log-content ${styles$a.lineContent}`, style: style, onClick: onClick }, data &&
              data.map((part, n) => (React__default["default"].createElement(LinePart, { wrapLines: this.props.wrapLines, part: part, format: formatPart, key: `line-${number}-${n}`, enableLinks: this.props.enableLinks })))));
      }
  }
  LineContent.defaultProps = {
      formatPart: null,
      style: null,
  };

  var css_248z$8 = ".index-module_lineGutter__aPlbD {\n  display: inline-flex;\n  overflow: hidden;\n  min-width: 20px;\n  padding-right: 0.5em;\n\n  color: #a7a7a7;\n  text-decoration: none;\n  user-select: none;\n}\n";
  var styles$9 = {"lineGutter":"index-module_lineGutter__aPlbD"};
  styleInject(css_248z$8);

  /**
   * The gutter is an element between the line number and content.
   */
  class LineGutter extends React.Component {
      render() {
          const { gutter } = this.props;
          return (React__default["default"].createElement("span", { className: `log-gutter ${styles$9.lineGutter}` }, gutter));
      }
  }
  LineGutter.defaultProps = {
      gutter: null,
  };

  var css_248z$7 = ".index-module_lineNumber__bNeiE {\n  display: inline-block;\n  width: 55px;\n  margin-left: 15px;\n  margin-right: 15px;\n  color: #7e7e7e;\n  user-select: none;\n  text-align: right;\n  min-width: 40px;\n  cursor: pointer;\n  text-decoration: none;\n  padding-right: 1em;\n  vertical-align: top;\n}\n\n.index-module_wrapLine__LQ9AC {\n    min-width: 55px;\n}\n\n.index-module_lineNumber__bNeiE::before {\n  content: attr(id);\n}\n\n.index-module_lineNumberHighlight__AqBvr {\n  color: #ffffff;\n}\n";
  var styles$8 = {"lineNumber":"index-module_lineNumber__bNeiE","wrapLine":"index-module_wrapLine__LQ9AC","lineNumberHighlight":"index-module_lineNumberHighlight__AqBvr index-module_lineNumber__bNeiE"};
  styleInject(css_248z$7);

  /**
   * The line number of a single line.
   * The anchor contained within is interactive, and will highlight the
   * entire line upon selection.
   */
  class LineNumber extends React.Component {
      render() {
          const { highlight, onClick, number, style } = this.props;
          const className = `log-number ${highlight ? styles$8.lineNumberHighlight : styles$8.lineNumber} ${this.props.wrapLines ? styles$8.wrapLine : ""}`;
          return (React__default["default"].createElement("a", { id: "" + number, onClick: onClick, className: className, style: style }));
      }
  }
  LineNumber.defaultProps = {
      style: null,
      highlight: false,
      onClick: null,
      wrapLines: false,
  };

  var css_248z$6 = ".index-module_line__BM5rd {\n  margin: 0;\n  user-select: none;\n}\n\n.index-module_wrapLine__uOMsW {\n    display: flex;\n}\n\n.index-module_line__BM5rd:hover {\n  background-color: #444444;\n}\n\n.index-module_lineHighlight__zcBLB {\n  background-color: #666666;\n}\n\n.index-module_lineSelectable__1-mwt {\n  user-select: text;\n}\n";
  var styles$7 = {"line":"index-module_line__BM5rd","wrapLine":"index-module_wrapLine__uOMsW","lineHighlight":"index-module_lineHighlight__zcBLB","lineSelectable":"index-module_lineSelectable__1-mwt"};
  styleInject(css_248z$6);

  /**
   * A single row of content, containing both the line number
   * and any text content within the line.
   */
  class Line extends React.Component {
      render() {
          const { data, formatPart, highlight, selectable, onLineNumberClick, onLineContentClick, number, rowHeight, style, className, highlightClassName, gutter, wrapLines, } = this.props;
          const selectableClass = selectable ? ` ${styles$7.lineSelectable}` : "";
          const highlightClass = highlight
              ? ` ${styles$7.lineHighlight} ${highlightClassName}`
              : "";
          const classes = `${styles$7.line}${selectableClass}${highlightClass} ${wrapLines ? styles$7.wrapLine : ""} ${className}`;
          const lineStyle = {
              ...style,
              lineHeight: `${style ? style.height || rowHeight : rowHeight}px`,
              minWidth: style ? style.width || "100%" : "100%",
              width: undefined,
          };
          return (React__default["default"].createElement("div", { className: classes, style: lineStyle },
              this.props.enableLineNumbers ? (React__default["default"].createElement(LineNumber, { number: number, highlight: highlight, onClick: onLineNumberClick, wrapLines: wrapLines })) : null,
              this.props.enableGutters ? (React__default["default"].createElement(LineGutter, { gutter: gutter })) : null,
              React__default["default"].createElement(LineContent, { wrapLines: wrapLines, number: number, formatPart: formatPart, data: data, onClick: onLineContentClick, enableLinks: this.props.enableLinks })));
      }
  }
  Line.defaultProps = {
      highlight: false,
      selectable: false,
      style: {},
      formatPart: undefined,
      onLineNumberClick: undefined,
      onLineContentClick: undefined,
      className: "",
      highlightClassName: "",
      enableLineNumbers: true,
      enableLinks: false,
      wrapLines: false,
  };

  var css_248z$5 = ".index-module_loading__Tw7fR {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  transform: translateX(-50%) translateY(-50%);\n}\n";
  var styles$6 = {"loading":"index-module_loading__Tw7fR"};
  styleInject(css_248z$5);

  /**
   * Just a loading spinner.
   */
  const Loading = React__default["default"].memo((inProps) => {
      return (React__default["default"].createElement("svg", { width: "44", height: "44", viewBox: "0 0 44 44", stroke: "#fff", className: styles$6.loading, ...inProps },
          React__default["default"].createElement("g", { fill: "none", fillRule: "evenodd", strokeWidth: "2" },
              React__default["default"].createElement("circle", { cx: "22", cy: "22", r: "1" },
                  React__default["default"].createElement("animate", { attributeName: "r", begin: "0s", dur: "1.8s", values: "1; 20", calcMode: "spline", keyTimes: "0; 1", keySplines: "0.165, 0.84, 0.44, 1", repeatCount: "indefinite" }),
                  React__default["default"].createElement("animate", { attributeName: "stroke-opacity", begin: "0s", dur: "1.8s", values: "1; 0", calcMode: "spline", keyTimes: "0; 1", keySplines: "0.3, 0.61, 0.355, 1", repeatCount: "indefinite" })),
              React__default["default"].createElement("circle", { cx: "22", cy: "22", r: "1" },
                  React__default["default"].createElement("animate", { attributeName: "r", begin: "-0.9s", dur: "1.8s", values: "1; 20", calcMode: "spline", keyTimes: "0; 1", keySplines: "0.165, 0.84, 0.44, 1", repeatCount: "indefinite" }),
                  React__default["default"].createElement("animate", { attributeName: "stroke-opacity", begin: "-0.9s", dur: "1.8s", values: "1; 0", calcMode: "spline", keyTimes: "0; 1", keySplines: "0.3, 0.61, 0.355, 1", repeatCount: "indefinite" })))));
  });
  Loading.displayName = "Loading";

  /**! 
   * hotkeys-js v3.13.15 
   * A simple micro-library for defining and dispatching keyboard shortcuts. It has no dependencies. 
   * 
   * Copyright (c) 2025 kenny wong <wowohoo@qq.com> 
   * https://github.com/jaywcjlove/hotkeys-js.git 
   * 
   * @website: https://jaywcjlove.github.io/hotkeys-js
   
   * Licensed under the MIT license 
   */

  const isff = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase().indexOf('firefox') > 0 : false;

  /** Bind event */
  function addEvent(object, event, method, useCapture) {
    if (object.addEventListener) {
      object.addEventListener(event, method, useCapture);
    } else if (object.attachEvent) {
      object.attachEvent("on".concat(event), method);
    }
  }
  function removeEvent(object, event, method, useCapture) {
    if (object.removeEventListener) {
      object.removeEventListener(event, method, useCapture);
    } else if (object.detachEvent) {
      object.detachEvent("on".concat(event), method);
    }
  }

  /** Convert modifier keys to their corresponding key codes */
  function getMods(modifier, key) {
    const mods = key.slice(0, key.length - 1);
    for (let i = 0; i < mods.length; i++) mods[i] = modifier[mods[i].toLowerCase()];
    return mods;
  }

  /** Process the input key string and convert it to an array */
  function getKeys(key) {
    if (typeof key !== 'string') key = '';
    key = key.replace(/\s/g, ''); // Match any whitespace character, including spaces, tabs, form feeds, etc.
    const keys = key.split(','); // Allow multiple shortcuts separated by ','
    let index = keys.lastIndexOf('');

    // Shortcut may include ',' — special handling needed
    for (; index >= 0;) {
      keys[index - 1] += ',';
      keys.splice(index, 1);
      index = keys.lastIndexOf('');
    }
    return keys;
  }

  /** Compare arrays of modifier keys */
  function compareArray(a1, a2) {
    const arr1 = a1.length >= a2.length ? a1 : a2;
    const arr2 = a1.length >= a2.length ? a2 : a1;
    let isIndex = true;
    for (let i = 0; i < arr1.length; i++) {
      if (arr2.indexOf(arr1[i]) === -1) isIndex = false;
    }
    return isIndex;
  }

  // Special Keys
  const _keyMap = {
    backspace: 8,
    '⌫': 8,
    tab: 9,
    clear: 12,
    enter: 13,
    '↩': 13,
    return: 13,
    esc: 27,
    escape: 27,
    space: 32,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    /// https://w3c.github.io/uievents/#events-keyboard-key-location
    arrowup: 38,
    arrowdown: 40,
    arrowleft: 37,
    arrowright: 39,
    del: 46,
    delete: 46,
    ins: 45,
    insert: 45,
    home: 36,
    end: 35,
    pageup: 33,
    pagedown: 34,
    capslock: 20,
    num_0: 96,
    num_1: 97,
    num_2: 98,
    num_3: 99,
    num_4: 100,
    num_5: 101,
    num_6: 102,
    num_7: 103,
    num_8: 104,
    num_9: 105,
    num_multiply: 106,
    num_add: 107,
    num_enter: 108,
    num_subtract: 109,
    num_decimal: 110,
    num_divide: 111,
    '⇪': 20,
    ',': 188,
    '.': 190,
    '/': 191,
    '`': 192,
    '-': isff ? 173 : 189,
    '=': isff ? 61 : 187,
    ';': isff ? 59 : 186,
    '\'': 222,
    '{': 219,
    '}': 221,
    '[': 219,
    ']': 221,
    '\\': 220
  };

  // Modifier Keys
  const _modifier = {
    // shiftKey
    '⇧': 16,
    shift: 16,
    // altKey
    '⌥': 18,
    alt: 18,
    option: 18,
    // ctrlKey
    '⌃': 17,
    ctrl: 17,
    control: 17,
    // metaKey
    '⌘': 91,
    cmd: 91,
    meta: 91,
    command: 91
  };
  const modifierMap = {
    16: 'shiftKey',
    18: 'altKey',
    17: 'ctrlKey',
    91: 'metaKey',
    shiftKey: 16,
    ctrlKey: 17,
    altKey: 18,
    metaKey: 91
  };
  const _mods = {
    16: false,
    18: false,
    17: false,
    91: false
  };
  const _handlers = {};

  // F1~F12 special key
  for (let k = 1; k < 20; k++) {
    _keyMap["f".concat(k)] = 111 + k;
  }

  /** Record the pressed keys */
  let _downKeys = [];
  /** Whether the window has already listened to the focus event */
  let winListendFocus = null;
  /** Default hotkey scope */
  let _scope = 'all';
  /** Map to record elements with bound events */
  const elementEventMap = new Map();

  /** Return key code */
  const code = x => _keyMap[x.toLowerCase()] || _modifier[x.toLowerCase()] || x.toUpperCase().charCodeAt(0);
  const getKey = x => Object.keys(_keyMap).find(k => _keyMap[k] === x);
  const getModifier = x => Object.keys(_modifier).find(k => _modifier[k] === x);

  /** Set or get the current scope (defaults to 'all') */
  function setScope(scope) {
    _scope = scope || 'all';
  }
  /** Get the current scope */
  function getScope() {
    return _scope || 'all';
  }
  /** Get the key codes of the currently pressed keys */
  function getPressedKeyCodes() {
    return _downKeys.slice(0);
  }
  function getPressedKeyString() {
    return _downKeys.map(c => getKey(c) || getModifier(c) || String.fromCharCode(c));
  }
  function getAllKeyCodes() {
    const result = [];
    Object.keys(_handlers).forEach(k => {
      _handlers[k].forEach(_ref => {
        let {
          key,
          scope,
          mods,
          shortcut
        } = _ref;
        result.push({
          scope,
          shortcut,
          mods,
          keys: key.split('+').map(v => code(v))
        });
      });
    });
    return result;
  }

  /** hotkey is effective only when filter return true */
  function filter(event) {
    const target = event.target || event.srcElement;
    const {
      tagName
    } = target;
    let flag = true;
    const isInput = tagName === 'INPUT' && !['checkbox', 'radio', 'range', 'button', 'file', 'reset', 'submit', 'color'].includes(target.type);
    // ignore: isContentEditable === 'true', <input> and <textarea> when readOnly state is false, <select>
    if (target.isContentEditable || (isInput || tagName === 'TEXTAREA' || tagName === 'SELECT') && !target.readOnly) {
      flag = false;
    }
    return flag;
  }

  /** Determine whether the pressed key matches a specific key, returns true or false */
  function isPressed(keyCode) {
    if (typeof keyCode === 'string') {
      keyCode = code(keyCode); // Convert to key code
    }
    return _downKeys.indexOf(keyCode) !== -1;
  }

  /** Loop through and delete all handlers with the specified scope */
  function deleteScope(scope, newScope) {
    let handlers;
    let i;

    // If no scope is specified, get the current scope
    if (!scope) scope = getScope();
    for (const key in _handlers) {
      if (Object.prototype.hasOwnProperty.call(_handlers, key)) {
        handlers = _handlers[key];
        for (i = 0; i < handlers.length;) {
          if (handlers[i].scope === scope) {
            const deleteItems = handlers.splice(i, 1);
            deleteItems.forEach(_ref2 => {
              let {
                element
              } = _ref2;
              return removeKeyEvent(element);
            });
          } else {
            i++;
          }
        }
      }
    }

    // If the current scope has been deleted, reset the scope to 'all'
    if (getScope() === scope) setScope(newScope || 'all');
  }

  /** Clear modifier keys */
  function clearModifier(event) {
    let key = event.keyCode || event.which || event.charCode;
    if (event.key && event.key.toLowerCase() === 'capslock') {
      // Ensure that when capturing keystrokes in modern browsers,
      // uppercase and lowercase letters (such as R and r) return the same key value.
      // https://github.com/jaywcjlove/hotkeys-js/pull/514
      // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
      key = code(event.key);
    }
    const i = _downKeys.indexOf(key);

    // Remove the pressed key from the list
    if (i >= 0) {
      _downKeys.splice(i, 1);
    }
    // Special handling for the command key: fix the issue where keyup only triggers once for command combos
    if (event.key && event.key.toLowerCase() === 'meta') {
      _downKeys.splice(0, _downKeys.length);
    }

    // Clear modifier keys: shiftKey, altKey, ctrlKey, (command || metaKey)
    if (key === 93 || key === 224) key = 91;
    if (key in _mods) {
      _mods[key] = false;

      // Reset the modifier key status to false
      for (const k in _modifier) if (_modifier[k] === key) hotkeys[k] = false;
    }
  }
  function unbind(keysInfo) {
    // unbind(), unbind all keys
    if (typeof keysInfo === 'undefined') {
      Object.keys(_handlers).forEach(key => {
        Array.isArray(_handlers[key]) && _handlers[key].forEach(info => eachUnbind(info));
        delete _handlers[key];
      });
      removeKeyEvent(null);
    } else if (Array.isArray(keysInfo)) {
      // support like : unbind([{key: 'ctrl+a', scope: 's1'}, {key: 'ctrl-a', scope: 's2', splitKey: '-'}])
      keysInfo.forEach(info => {
        if (info.key) eachUnbind(info);
      });
    } else if (typeof keysInfo === 'object') {
      // support like unbind({key: 'ctrl+a, ctrl+b', scope:'abc'})
      if (keysInfo.key) eachUnbind(keysInfo);
    } else if (typeof keysInfo === 'string') {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      // support old method
      // eslint-disable-line
      let [scope, method] = args;
      if (typeof scope === 'function') {
        method = scope;
        scope = '';
      }
      eachUnbind({
        key: keysInfo,
        scope,
        method,
        splitKey: '+'
      });
    }
  }

  /** Unbind hotkeys for a specific scope */
  const eachUnbind = _ref3 => {
    let {
      key,
      scope,
      method,
      splitKey = '+'
    } = _ref3;
    const multipleKeys = getKeys(key);
    multipleKeys.forEach(originKey => {
      const unbindKeys = originKey.split(splitKey);
      const len = unbindKeys.length;
      const lastKey = unbindKeys[len - 1];
      const keyCode = lastKey === '*' ? '*' : code(lastKey);
      if (!_handlers[keyCode]) return;
      // If scope is not provided, get the current scope
      if (!scope) scope = getScope();
      const mods = len > 1 ? getMods(_modifier, unbindKeys) : [];
      const unbindElements = [];
      _handlers[keyCode] = _handlers[keyCode].filter(record => {
        // Check if the method matches; if method is provided, must be equal to unbind
        const isMatchingMethod = method ? record.method === method : true;
        const isUnbind = isMatchingMethod && record.scope === scope && compareArray(record.mods, mods);
        if (isUnbind) unbindElements.push(record.element);
        return !isUnbind;
      });
      unbindElements.forEach(element => removeKeyEvent(element));
    });
  };

  /** Handle the callback function for the corresponding hotkey */
  function eventHandler(event, handler, scope, element) {
    if (handler.element !== element) {
      return;
    }
    let modifiersMatch;

    // Check if it is within the current scope
    if (handler.scope === scope || handler.scope === 'all') {
      // Check whether modifier keys match (returns true if they do)
      modifiersMatch = handler.mods.length > 0;
      for (const y in _mods) {
        if (Object.prototype.hasOwnProperty.call(_mods, y)) {
          if (!_mods[y] && handler.mods.indexOf(+y) > -1 || _mods[y] && handler.mods.indexOf(+y) === -1) {
            modifiersMatch = false;
          }
        }
      }

      // Call the handler function; ignore if it's only a modifier key
      if (handler.mods.length === 0 && !_mods[16] && !_mods[18] && !_mods[17] && !_mods[91] || modifiersMatch || handler.shortcut === '*') {
        handler.keys = [];
        handler.keys = handler.keys.concat(_downKeys);
        if (handler.method(event, handler) === false) {
          if (event.preventDefault) event.preventDefault();else event.returnValue = false;
          if (event.stopPropagation) event.stopPropagation();
          if (event.cancelBubble) event.cancelBubble = true;
        }
      }
    }
  }

  /** Handle the keydown event */
  function dispatch(event, element) {
    const asterisk = _handlers['*'];
    let key = event.keyCode || event.which || event.charCode;
    // Ensure that when capturing keystrokes in modern browsers,
    // uppercase and lowercase letters (such as R and r) return the same key value.
    // https://github.com/jaywcjlove/hotkeys-js/pull/514
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
    // CapsLock key
    // There's an issue where `keydown` and `keyup` events are not triggered after CapsLock is enabled to activate uppercase.
    if (event.key && event.key.toLowerCase() === 'capslock') {
      return;
    }
    // Form control filter: by default, shortcut keys are not triggered in form elements
    if (!hotkeys.filter.call(this, event)) return;

    // In Gecko (Firefox), the command key code is 224; unify it with WebKit (Chrome)
    // In WebKit, left and right command keys have different codes
    if (key === 93 || key === 224) key = 91;

    /**
     * Collect bound keys
     * If an Input Method Editor is processing key input and the event is keydown, return 229.
     * https://stackoverflow.com/questions/25043934/is-it-ok-to-ignore-keydown-events-with-keycode-229
     * http://lists.w3.org/Archives/Public/www-dom/2010JulSep/att-0182/keyCode-spec.html
     */
    if (_downKeys.indexOf(key) === -1 && key !== 229) _downKeys.push(key);
    /**
     * Jest test cases are required.
     * ===============================
     */
    ['metaKey', 'ctrlKey', 'altKey', 'shiftKey'].forEach(keyName => {
      const keyNum = modifierMap[keyName];
      if (event[keyName] && _downKeys.indexOf(keyNum) === -1) {
        _downKeys.push(keyNum);
      } else if (!event[keyName] && _downKeys.indexOf(keyNum) > -1) {
        _downKeys.splice(_downKeys.indexOf(keyNum), 1);
      } else if (keyName === 'metaKey' && event[keyName]) {
        // If the command key is pressed, clear all non-modifier keys except the current event key.
        // This is because keyup for non-modifier keys will NEVER be triggered when command is pressed.
        // This is a known browser limitation.
        _downKeys = _downKeys.filter(k => k in modifierMap || k === key);
      }
    });
    /**
     * -------------------------------
     */
    if (key in _mods) {
      _mods[key] = true;
      // Register special modifier keys to the `hotkeys` object
      for (const k in _modifier) {
        if (Object.prototype.hasOwnProperty.call(_modifier, k)) {
          const eventKey = modifierMap[_modifier[k]];
          hotkeys[k] = event[eventKey];
        }
      }
      if (!asterisk) return;
    }

    // Bind the modifier keys in modifierMap to the event
    for (const e in _mods) {
      if (Object.prototype.hasOwnProperty.call(_mods, e)) {
        _mods[e] = event[modifierMap[e]];
      }
    }
    /**
     * https://github.com/jaywcjlove/hotkeys/pull/129
     * This solves the issue in Firefox on Windows where hotkeys corresponding to special characters would not trigger.
     * An example of this is ctrl+alt+m on a Swedish keyboard which is used to type μ.
     * Browser support: https://caniuse.com/#feat=keyboardevent-getmodifierstate
     */
    if (event.getModifierState && !(event.altKey && !event.ctrlKey) && event.getModifierState('AltGraph')) {
      if (_downKeys.indexOf(17) === -1) {
        _downKeys.push(17);
      }
      if (_downKeys.indexOf(18) === -1) {
        _downKeys.push(18);
      }
      _mods[17] = true;
      _mods[18] = true;
    }

    // Get the current scope (defaults to 'all')
    const scope = getScope();
    // Handle any hotkeys registered as '*'
    if (asterisk) {
      for (let i = 0; i < asterisk.length; i++) {
        if (asterisk[i].scope === scope && (event.type === 'keydown' && asterisk[i].keydown || event.type === 'keyup' && asterisk[i].keyup)) {
          eventHandler(event, asterisk[i], scope, element);
        }
      }
    }
    // If the key is not registered, return
    if (!(key in _handlers)) return;
    const handlerKey = _handlers[key];
    const keyLen = handlerKey.length;
    for (let i = 0; i < keyLen; i++) {
      if (event.type === 'keydown' && handlerKey[i].keydown || event.type === 'keyup' && handlerKey[i].keyup) {
        if (handlerKey[i].key) {
          const record = handlerKey[i];
          const {
            splitKey
          } = record;
          const keyShortcut = record.key.split(splitKey);
          const _downKeysCurrent = []; // Store the current key codes
          for (let a = 0; a < keyShortcut.length; a++) {
            _downKeysCurrent.push(code(keyShortcut[a]));
          }
          if (_downKeysCurrent.sort().join('') === _downKeys.sort().join('')) {
            // Match found, call the handler
            eventHandler(event, record, scope, element);
          }
        }
      }
    }
  }
  function hotkeys(key, option, method) {
    _downKeys = [];
    /** List of hotkeys to handle */
    const keys = getKeys(key);
    let mods = [];
    /** Default scope is 'all', meaning effective in all scopes */
    let scope = 'all';
    /** Element to which the hotkey events are bound */
    let element = document;
    let i = 0;
    let keyup = false;
    let keydown = true;
    let splitKey = '+';
    let capture = false;
    /** Allow only a single callback */
    let single = false;

    // Determine if the second argument is a function (no options provided)
    if (method === undefined && typeof option === 'function') {
      method = option;
    }

    // Parse options object
    if (Object.prototype.toString.call(option) === '[object Object]') {
      if (option.scope) scope = option.scope; // Set scope
      if (option.element) element = option.element; // Set binding element
      if (option.keyup) keyup = option.keyup;
      if (option.keydown !== undefined) keydown = option.keydown;
      if (option.capture !== undefined) capture = option.capture;
      if (typeof option.splitKey === 'string') splitKey = option.splitKey;
      if (option.single === true) single = true;
    }
    if (typeof option === 'string') scope = option;

    // If only one callback is allowed, unbind the existing one first
    if (single) unbind(key, scope);

    // Handle each hotkey
    for (; i < keys.length; i++) {
      key = keys[i].split(splitKey); // Split into individual keys
      mods = [];

      // If it's a combination, extract modifier keys
      if (key.length > 1) mods = getMods(_modifier, key);

      // Convert non-modifier key to key code
      key = key[key.length - 1];
      key = key === '*' ? '*' : code(key); // '*' means match all hotkeys

      // Initialize handler array if this key has no handlers yet
      if (!(key in _handlers)) _handlers[key] = [];
      _handlers[key].push({
        keyup,
        keydown,
        scope,
        mods,
        shortcut: keys[i],
        method,
        key: keys[i],
        splitKey,
        element
      });
    }
    // Register hotkey event listeners on the global document
    if (typeof element !== 'undefined' && window) {
      if (!elementEventMap.has(element)) {
        const keydownListener = function () {
          let event = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : window.event;
          return dispatch(event, element);
        };
        const keyupListenr = function () {
          let event = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : window.event;
          dispatch(event, element);
          clearModifier(event);
        };
        elementEventMap.set(element, {
          keydownListener,
          keyupListenr,
          capture
        });
        addEvent(element, 'keydown', keydownListener, capture);
        addEvent(element, 'keyup', keyupListenr, capture);
      }
      // Register focus event listener once to clear pressed keys on window focus
      if (!winListendFocus) {
        const listener = () => {
          _downKeys = [];
        };
        winListendFocus = {
          listener,
          capture
        };
        addEvent(window, 'focus', listener, capture);
      }
    }
  }
  function trigger(shortcut) {
    let scope = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'all';
    Object.keys(_handlers).forEach(key => {
      const dataList = _handlers[key].filter(item => item.scope === scope && item.shortcut === shortcut);
      dataList.forEach(data => {
        if (data && data.method) {
          data.method();
        }
      });
    });
  }

  /** Clean up event listeners. After unbinding, check whether the element still has any hotkeys bound. If not, remove its event listeners. */
  function removeKeyEvent(element) {
    const values = Object.values(_handlers).flat();
    const findindex = values.findIndex(_ref4 => {
      let {
        element: el
      } = _ref4;
      return el === element;
    });
    if (findindex < 0) {
      const {
        keydownListener,
        keyupListenr,
        capture
      } = elementEventMap.get(element) || {};
      if (keydownListener && keyupListenr) {
        removeEvent(element, 'keyup', keyupListenr, capture);
        removeEvent(element, 'keydown', keydownListener, capture);
        elementEventMap.delete(element);
      }
    }
    if (values.length <= 0 || elementEventMap.size <= 0) {
      // Remove all event listeners from all elements
      const eventKeys = Object.keys(elementEventMap);
      eventKeys.forEach(el => {
        const {
          keydownListener,
          keyupListenr,
          capture
        } = elementEventMap.get(el) || {};
        if (keydownListener && keyupListenr) {
          removeEvent(el, 'keyup', keyupListenr, capture);
          removeEvent(el, 'keydown', keydownListener, capture);
          elementEventMap.delete(el);
        }
      });
      // Clear the elementEventMap
      elementEventMap.clear();
      // Clear all handlers
      Object.keys(_handlers).forEach(key => delete _handlers[key]);
      // Remove the global window focus event listener
      if (winListendFocus) {
        const {
          listener,
          capture
        } = winListendFocus;
        removeEvent(window, 'focus', listener, capture);
        winListendFocus = null;
      }
    }
  }
  const _api = {
    getPressedKeyString,
    setScope,
    getScope,
    deleteScope,
    getPressedKeyCodes,
    getAllKeyCodes,
    isPressed,
    filter,
    trigger,
    unbind,
    keyMap: _keyMap,
    modifier: _modifier,
    modifierMap
  };
  for (const a in _api) {
    if (Object.prototype.hasOwnProperty.call(_api, a)) {
      hotkeys[a] = _api[a];
    }
  }
  if (typeof window !== 'undefined') {
    const _hotkeys = window.hotkeys;
    hotkeys.noConflict = deep => {
      if (deep && window.hotkeys === hotkeys) {
        window.hotkeys = _hotkeys;
      }
      return hotkeys;
    };
    window.hotkeys = hotkeys;
  }

  var css_248z$4 = ".index-module_downArrowIcon__fpzoO {\n    height: 15px;\n    cursor: pointer;\n}\n";
  var styles$5 = {"downArrowIcon":"index-module_downArrowIcon__fpzoO"};
  styleInject(css_248z$4);

  const DownArrowIcon = React__default["default"].memo((props) => {
      return (React__default["default"].createElement("svg", { className: styles$5.downArrowIcon, ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 115.4 122.88" },
          React__default["default"].createElement("path", { d: "M24.94,55A14.66,14.66,0,0,0,4.38,75.91l43.45,42.76a14.66,14.66,0,0,0,20.56,0L111,76.73A14.66,14.66,0,0,0,90.46,55.82l-18,17.69-.29-59.17c-.1-19.28-29.42-19-29.33.24l.29,58.34L24.94,55Z" })));
  });

  var css_248z$3 = ".index-module_upArrowIcon__lxdzV {\n    height: 15px;\n    cursor: pointer;\n}\n";
  var styles$4 = {"upArrowIcon":"index-module_upArrowIcon__lxdzV"};
  styleInject(css_248z$3);

  const UpArrowIcon = React__default["default"].memo((props) => {
      return (React__default["default"].createElement("svg", { className: styles$4.upArrowIcon, ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 115.4 122.88" },
          React__default["default"].createElement("path", { d: "M24.94,67.88A14.66,14.66,0,0,1,4.38,47L47.83,4.21a14.66,14.66,0,0,1,20.56,0L111,46.15A14.66,14.66,0,0,1,90.46,67.06l-18-17.69-.29,59.17c-.1,19.28-29.42,19-29.33-.25L43.14,50,24.94,67.88Z" })));
  });

  var css_248z$2 = ".index-module_filterLinesIcon__EsTp0 {\n  height: 15px;\n  cursor: pointer;\n}\n";
  var styles$3 = {"filterLinesIcon":"index-module_filterLinesIcon__EsTp0"};
  styleInject(css_248z$2);

  const FilterLinesIcon = React__default["default"].memo((props) => {
      return (React__default["default"].createElement("svg", { className: styles$3.filterLinesIcon, ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 286.054 286.054" },
          React__default["default"].createElement("path", { d: "M8.939 44.696h178.784a8.931 8.931 0 0 0 8.939-8.939V8.939A8.937 8.937 0 0 0 187.723 0H8.939C4.005 0 0 4.005 0 8.939v26.818c0 4.934 4.005 8.939 8.939 8.939zm268.176 35.757H8.939C4.005 80.453 0 84.457 0 89.392v26.818a8.937 8.937 0 0 0 8.939 8.939h268.176a8.931 8.931 0 0 0 8.939-8.939V89.392a8.936 8.936 0 0 0-8.939-8.939zM8.939 205.601h178.784a8.931 8.931 0 0 0 8.939-8.939v-26.818a8.931 8.931 0 0 0-8.939-8.939H8.939A8.937 8.937 0 0 0 0 169.844v26.818a8.937 8.937 0 0 0 8.939 8.939zm268.176 35.757H8.939A8.937 8.937 0 0 0 0 250.297v26.818a8.937 8.937 0 0 0 8.939 8.939h268.176a8.931 8.931 0 0 0 8.939-8.939v-26.818a8.931 8.931 0 0 0-8.939-8.939z" })));
  });

  var css_248z$1 = ".index-module_searchBar__wNJXf {\n    display: flex;\n    align-items: center;\n    justify-content: flex-end;\n    font-family: \"Monaco\", monospace;\n    font-size: 12px;\n    background-color: #222222;\n    color: #d6d6d6;\n    padding: 10px;\n}\n\n.index-module_searchInput__lE-5o {\n    background-color: #464646;\n    color: #d6d6d6;\n    height: 20px;\n    min-width: 200px;\n    font-size: 12px;\n    padding: 2px 5px;\n    border: 1px solid #4e4e4e;\n    margin-right: 10px;\n}\n\n.index-module_active__d-59A {\n    color: #d6d6d6;\n    fill: #d6d6d6;\n}\n\n.index-module_clickable__DD2Kj:hover {\n    border-radius: 5px;\n    background: #666666;\n}\n\n.index-module_inactive__bJYFs {\n    color: #464646;\n    fill: #464646;\n    padding: 3px;\n    padding-bottom: 1px;\n}\n\n.index-module_button__0-ptH {\n    background: none;\n    border: none;\n    margin-right: 10px;\n}\n";
  var styles$2 = {"searchBar":"index-module_searchBar__wNJXf","searchInput":"index-module_searchInput__lE-5o","active":"index-module_active__d-59A","clickable":"index-module_clickable__DD2Kj","inactive":"index-module_inactive__bJYFs","button":"index-module_button__0-ptH"};
  styleInject(css_248z$1);

  /* eslint-disable @typescript-eslint/no-empty-function */
  class SearchBar extends React.Component {
      constructor(props) {
          super(props);
          this.state = {
              keywords: "",
          };
          this.handleSearchChange = (e) => {
              const { value: keywords } = e.target;
              this.setState({ keywords }, () => this.search());
          };
          this.handleFilterToggle = () => {
              this.props.onFilterLinesWithMatches &&
                  this.props.onFilterLinesWithMatches(!this.props.filterActive);
          };
          this.handleKeyPress = (e) => {
              if (e.key === "Enter") {
                  if (e.shiftKey) {
                      this.props.onShiftEnter && this.props.onShiftEnter(e);
                  }
                  else {
                      this.props.onEnter && this.props.onEnter(e);
                  }
              }
          };
          this.handleSearchHotkey = (e) => {
              if (!this.inputRef.current) {
                  return;
              }
              e.preventDefault();
              this.inputRef.current.focus();
          };
          this.search = () => {
              const { keywords } = this.state;
              const { onSearch, onClearSearch, searchMinCharacters = 2 } = this.props;
              if (keywords && keywords.length > searchMinCharacters) {
                  onSearch && onSearch(keywords);
              }
              else {
                  onClearSearch && onClearSearch();
              }
          };
          this.inputRef = React.createRef();
      }
      componentDidMount() {
          if (this.props.enableHotKeys) {
              const $this = this;
              hotkeys("ctrl+f,command+f,f3,ctrl+f3", function (event, handler) {
                  switch (handler.key) {
                      case "ctrl+f":
                      case "command+f":
                          $this.handleSearchHotkey(event);
                          event.preventDefault();
                          break;
                      case "f3":
                          // @ts-ignore
                          $this.props.onEnter(event);
                          event.preventDefault();
                          break;
                      case "ctrl+f3":
                          // @ts-ignore
                          $this.props.onShiftEnter(event);
                          event.preventDefault();
                          break;
                      // do nothing
                  }
              });
              hotkeys.filter = () => true;
          }
      }
      componentWillUnmount() {
          if (this.props.enableHotKeys) {
              hotkeys.deleteScope("all");
          }
      }
      render() {
          const { resultsCount, filterActive, disabled, enableSearchNavigation, currentResultsPosition, onEnter, onShiftEnter, } = this.props;
          const matchesLabel = `match${resultsCount === 1 ? "" : "es"}`;
          const filterIcon = filterActive ? styles$2.active : styles$2.inactive;
          const arrowIcon = resultsCount ? styles$2.active : styles$2.inactive;
          return (React__default["default"].createElement("div", { className: `react-lazylog-searchbar ${styles$2.searchBar}` },
              React__default["default"].createElement("span", { className: `react-lazylog-searchbar-matches ${resultsCount ? "active" : "inactive"} ${resultsCount ? styles$2.active : styles$2.inactive}`, style: { marginRight: "10px" } }, enableSearchNavigation && resultsCount
                  ? `${currentResultsPosition + 1} of ${resultsCount} ${matchesLabel}`
                  : `${resultsCount} ${matchesLabel}`),
              React__default["default"].createElement("input", { autoComplete: "off", type: "text", name: "search", placeholder: "Search", className: `react-lazylog-searchbar-input ${styles$2.searchInput}`, onChange: this.handleSearchChange, onKeyUp: this.handleKeyPress, value: this.state.keywords, disabled: disabled, ref: this.inputRef, "aria-label": "Search Log" }),
              React__default["default"].createElement("button", { title: "Filter Lines", disabled: disabled, className: `react-lazylog-searchbar-filter ${filterActive ? "active" : "inactive"} ${styles$2.button} ${filterIcon} ${styles$2.clickable}`, onKeyUp: this.handleKeyPress, onMouseUp: this.handleFilterToggle }, this.props.iconFilterLines || React__default["default"].createElement(FilterLinesIcon, null)),
              enableSearchNavigation && (React__default["default"].createElement(React.Fragment, null,
                  React__default["default"].createElement("button", { title: "Previous", disabled: disabled, className: `react-lazylog-searchbar-up-arrow ${resultsCount
                        ? `active ${styles$2.clickable}`
                        : "inactive"} ${styles$2.button} ${arrowIcon}`, onClick: onShiftEnter }, this.props.iconFindPrevious || React__default["default"].createElement(UpArrowIcon, null)),
                  React__default["default"].createElement("button", { title: "Next", disabled: disabled, className: `react-lazylog-searchbar-down-arrow ${resultsCount
                        ? `active ${styles$2.clickable}`
                        : "inactive"} ${styles$2.button} ${arrowIcon}`, onClick: onEnter }, this.props.iconFindNext || React__default["default"].createElement(DownArrowIcon, null))))));
      }
  }
  SearchBar.defaultProps = {
      currentResultsPosition: 0,
      disabled: false,
      enableHotKeys: false,
      filterActive: false,
      onClearSearch: () => { },
      onFilterLinesWithMatches: () => { },
      onSearch: () => { },
      resultsCount: 0,
      searchMinCharacters: 2,
  };

  const foregroundColors = {
      "30": "black",
      "31": "red",
      "32": "green",
      "33": "yellow",
      "34": "blue",
      "35": "magenta",
      "36": "cyan",
      "37": "white",
      "90": "grey",
  };
  const backgroundColors = {
      "40": "black",
      "41": "red",
      "42": "green",
      "43": "yellow",
      "44": "blue",
      "45": "magenta",
      "46": "cyan",
      "47": "white",
  };
  const styles$1 = {
      "1": "bold",
      "3": "italic",
      "4": "underline",
  };
  const eraseChar = (matchingText, result) => {
      if (matchingText.length) {
          return [matchingText.substr(0, matchingText.length - 1), result];
      }
      else if (result.length) {
          const index = result.length - 1;
          const { text } = result[index];
          const newResult = text.length === 1
              ? result.slice(0, result.length - 1)
              : result.map((item, i) => index === i
                  ? { ...item, text: text.substr(0, text.length - 1) }
                  : item);
          return [matchingText, newResult];
      }
      return [matchingText, result];
  };
  const ansiparse = (str) => {
      let matchingControl = null;
      let matchingData = null;
      let matchingText = "";
      let ansiState = [];
      let result = [];
      let state = {};
      for (let i = 0; i < str.length; i++) {
          if (matchingControl !== null) {
              if (matchingControl === "\x1b" && str[i] === "[") {
                  if (matchingText) {
                      state.text = matchingText;
                      result.push(state);
                      state = { text: "" };
                      matchingText = "";
                  }
                  matchingControl = null;
                  matchingData = "";
              }
              else {
                  matchingText += matchingControl + str[i];
                  matchingControl = null;
              }
              continue;
          }
          else if (matchingData !== null) {
              if (str[i] === ";") {
                  ansiState.push(matchingData);
                  matchingData = "";
              }
              else if (str[i] === "m") {
                  ansiState.push(matchingData);
                  matchingData = null;
                  matchingText = "";
                  for (let a = 0; a < ansiState.length; a++) {
                      const ansiCode = ansiState[a];
                      if (foregroundColors[ansiCode]) {
                          state.foreground = foregroundColors[ansiCode];
                      }
                      else if (backgroundColors[ansiCode]) {
                          state.background = backgroundColors[ansiCode];
                      }
                      else if (ansiCode === "39") {
                          delete state.foreground;
                      }
                      else if (ansiCode === "49") {
                          delete state.background;
                      }
                      else if (styles$1[ansiCode]) {
                          state[styles$1[ansiCode]] = true;
                      }
                      else if (ansiCode === "22") {
                          state.bold = false;
                      }
                      else if (ansiCode === "23") {
                          state.italic = false;
                      }
                      else if (ansiCode === "24") {
                          state.underline = false;
                      }
                  }
                  ansiState = [];
              }
              else {
                  matchingData += str[i];
              }
              continue;
          }
          if (str[i] === "\x1b") {
              matchingControl = str[i];
          }
          else if (str[i] === "\u0008") {
              [matchingText, result] = eraseChar(matchingText, result);
          }
          else {
              matchingText += str[i];
          }
      }
      if (matchingText) {
          state.text = matchingText + (matchingControl || "");
          result.push(state);
      }
      return result;
  };

  const encode = (value) => new TextEncoder().encode(value);
  const decode = (value) => {
      if (!ArrayBuffer.isView(value)) {
          value = new Uint8Array([value]);
      }
      return new TextDecoder("utf-8").decode(value);
  };

  function mitt(n){return {all:n=n||new Map,on:function(t,e){var i=n.get(t);i?i.push(e):n.set(t,[e]);},off:function(t,e){var i=n.get(t);i&&(e?i.splice(i.indexOf(e)>>>0,1):n.set(t,[]));},emit:function(t,e){var i=n.get(t);i&&i.slice().map(function(n){n(e);}),(i=n.get("*"))&&i.slice().map(function(n){n(t,e);});}}}

  function getDefaultExportFromCjs (x) {
  	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
  }

  /* eslint-disable vars-on-top, no-var, prefer-template */

  var isRegExp = function (re) { 
    return re instanceof RegExp;
  };
  var escapeRegExp = function escapeRegExp(string) {
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g,
      reHasRegExpChar = RegExp(reRegExpChar.source);

    return (string && reHasRegExpChar.test(string))
      ? string.replace(reRegExpChar, '\\$&')
      : string;
  };
  var isString = function (value) {
    return typeof value === 'string';
  };
  var flatten = function (array) {
    var newArray = [];

    array.forEach(function (item) {
      if (Array.isArray(item)) {
        newArray = newArray.concat(item);
      } else {
        newArray.push(item);
      }
    });

    return newArray;
  };

  /**
   * Given a string, replace every substring that is matched by the `match` regex
   * with the result of calling `fn` on matched substring. The result will be an
   * array with all odd indexed elements containing the replacements. The primary
   * use case is similar to using String.prototype.replace except for React.
   *
   * React will happily render an array as children of a react element, which
   * makes this approach very useful for tasks like surrounding certain text
   * within a string with react elements.
   *
   * Example:
   * matchReplace(
   *   'Emphasize all phone numbers like 884-555-4443.',
   *   /([\d|-]+)/g,
   *   (number, i) => <strong key={i}>{number}</strong>
   * );
   * // => ['Emphasize all phone numbers like ', <strong>884-555-4443</strong>, '.'
   *
   * @param {string} str
   * @param {RegExp|str} match Must contain a matching group
   * @param {function} fn
   * @return {array}
   */
  function replaceString(str, match, fn) {
    var curCharStart = 0;
    var curCharLen = 0;

    if (str === '') {
      return str;
    } else if (!str || !isString(str)) {
      throw new TypeError('First argument to react-string-replace#replaceString must be a string');
    }

    var re = match;

    if (!isRegExp(re)) {
      re = new RegExp('(' + escapeRegExp(re) + ')', 'gi');
    }

    var result = str.split(re);

    // Apply fn to all odd elements
    for (var i = 1, length = result.length; i < length; i += 2) {
      /** @see {@link https://github.com/iansinnott/react-string-replace/issues/74} */
      if (result[i] === undefined || result[i - 1] === undefined) {
        console.warn('reactStringReplace: Encountered undefined value during string replacement. Your RegExp may not be working the way you expect.');
        continue;
      }

      curCharLen = result[i].length;
      curCharStart += result[i - 1].length;
      result[i] = fn(result[i], i, curCharStart);
      curCharStart += curCharLen;
    }

    return result;
  }

  var reactStringReplace = function reactStringReplace(source, match, fn) {
    if (!Array.isArray(source)) source = [source];

    return flatten(source.map(function(x) {
      return isString(x) ? replaceString(x, match, fn) : x;
    }));
  };

  var reactStringReplace$1 = /*@__PURE__*/getDefaultExportFromCjs(reactStringReplace);

  const ENCODED_NEWLINE = 10; // \n
  const ENCODED_CARRIAGE_RETURN = 13; // \r
  const SEARCH_BAR_HEIGHT = 45;
  const isNewline = (current) => current === ENCODED_NEWLINE || current === ENCODED_CARRIAGE_RETURN;
  const getScrollIndex = ({ follow = false, scrollToLine = 0, previousCount = 0, count = 0, offset = 0, }) => {
      if (follow) {
          return count - 1 - offset;
      }
      else if (scrollToLine && previousCount > scrollToLine) {
          return -1;
      }
      else if (scrollToLine) {
          return scrollToLine - 1 - offset;
      }
      return -1;
  };
  const getHighlightRange = (highlight) => {
      /**
       * Set to Range(0, 0) if:
       * 1) highlight doesn't evaluate to "true"
       * 2) highlight is not a number
       * 3) highlight is an array where a value isn't a number
       */
      if (!highlight ||
          (Array.isArray(highlight) &&
              (isNaN(highlight[0]) || isNaN(highlight[1]))) ||
          (!Array.isArray(highlight) && isNaN(highlight))) {
          return Range(0, 0);
      }
      if (!Array.isArray(highlight)) {
          return Range(highlight, highlight + 1);
      }
      if (highlight.length === 1) {
          return Range(highlight[0], highlight[0] + 1);
      }
      return Range(highlight[0], highlight[1] + 1);
  };
  const bufferConcat = (a, b) => {
      const buffer = new Uint8Array(a.length + b.length);
      buffer.set(a, 0);
      buffer.set(b, a.length);
      return buffer;
  };
  const convertBufferToLines = (currentArray, previousArray) => {
      const buffer = previousArray
          ? bufferConcat(previousArray, currentArray)
          : currentArray;
      const { length } = buffer;
      let lastNewlineIndex = 0;
      let index = 0;
      const lines = List().withMutations((lines) => {
          while (index < length) {
              const current = buffer[index];
              const next = buffer[index + 1];
              if (isNewline(current)) {
                  lines.push(buffer.subarray(lastNewlineIndex, index));
                  lastNewlineIndex =
                      current === ENCODED_CARRIAGE_RETURN &&
                          next === ENCODED_NEWLINE
                          ? index + 2
                          : index + 1;
                  index = lastNewlineIndex;
              }
              else {
                  index += 1;
              }
          }
          if (!previousArray && index !== lastNewlineIndex) {
              lines.push(buffer.slice(lastNewlineIndex));
          }
      });
      return {
          lines,
          remaining: index !== lastNewlineIndex ? buffer.slice(lastNewlineIndex) : null,
      };
  };
  const getLinesLengthRanges = (rawLog) => {
      const { length } = rawLog;
      const linesRanges = [];
      let lastNewlineIndex = 0;
      let index = 0;
      while (index < length) {
          const current = rawLog[index];
          const next = rawLog[index + 1];
          if (isNewline(current)) {
              linesRanges.push(index);
              lastNewlineIndex =
                  current === ENCODED_CARRIAGE_RETURN && next === ENCODED_NEWLINE
                      ? index + 2
                      : index + 1;
              index = lastNewlineIndex;
          }
          else {
              index += 1;
          }
      }
      return linesRanges;
  };
  const searchFormatPart = ({ searchKeywords, nextFormatPart, caseInsensitive, replaceJsx, 
  // True if this is the line the browser search is highlighting
  selectedLine, replaceJsxHighlight, 
  /**
   * highlightedWordLocation is a bit weird, it deals with
   * the special highlighting of a searched term
   * if it is the one the browser-like search is currently
   * highlighting. This is to deal with the case where there are
   * multiple instances of the searched term in the same line,
   * to make sure the correct one is highlighted.
   */
  highlightedWordLocation, }) => (part) => {
      let formattedPart = part;
      if (nextFormatPart) {
          formattedPart = nextFormatPart(part);
      }
      // Escape out regex characters so they're treated as normal
      // characters when we use regex to search for them.
      const regexKeywords = searchKeywords.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      // Split part on keywords
      const splitExp = new RegExp(`(?=${regexKeywords})`, caseInsensitive ? "i" : undefined);
      const splitParts = part.split(splitExp);
      // Expression to replace keywords
      const replaceExp = new RegExp(`(${regexKeywords})`, caseInsensitive ? "i" : undefined);
      // This deals with the special highlighting that occurs when a
      // line is selected using the browser search
      const handleHighlighting = () => {
          // If this line is selected so we need to deal with special highlighting
          if (selectedLine) {
              // This is the special case where the searched
              // word is at the very start of the string
              if (splitParts.length === 1) {
                  formattedPart = reactStringReplace$1(formattedPart, regexKeywords, replaceJsxHighlight);
              }
              else {
                  // This highlights the special color
                  // if the word is selected, otherwise, just
                  // the regular matched search term color
                  formattedPart = splitParts.map((splitPart, index) => reactStringReplace$1(splitPart, replaceExp, index === highlightedWordLocation
                      ? replaceJsxHighlight
                      : replaceJsx));
              }
          }
          // Finally, just do regular highlighting since this line isn't selected
          else {
              formattedPart = reactStringReplace$1(formattedPart, replaceExp, replaceJsx);
          }
          return formattedPart;
      };
      if (caseInsensitive) {
          if (part.toLowerCase().includes(searchKeywords.toLowerCase())) {
              formattedPart = handleHighlighting();
          }
      }
      else if (part.includes(searchKeywords)) {
          formattedPart = handleHighlighting();
      }
      return formattedPart;
  };
  // General Email Regex (RFC 5322 Official Standard)
  const emailPattern = '^(?:(?!.*?[.]{2})[a-zA-Z0-9](?:[a-zA-Z0-9.+!%-]{1,64}|)|"[a-zA-Z0-9.+!% -]{1,64}")';
  const emailDomainPattern = "[a-zA-Z0-9][a-zA-Z0-9.-]+(.[a-z]{2,}|.[0-9]{1,})$";
  const emailRegex = new RegExp(`${emailPattern}@${emailDomainPattern}`);
  const protocolClause = "(((http|ftp)?s?s?)(:)(/{2}))";
  // Add some RegEx magic from xterm.js | xterm-addon-web-links
  // https://github.com/xtermjs/xterm.js/blob/master/addons/addon-web-links/src/WebLinksAddon.ts
  // consider everthing starting with http:// or https://
  // up to first whitespace, `"` or `'` as url
  // NOTE: The repeated end clause is needed to not match a dangling `:`
  // resembling the old (...)*([^:"\'\\s]) final path clause
  // additionally exclude early + final:
  // - unsafe from rfc3986: !*'()
  // - unsafe chars from rfc1738: {}|\^~[]` (minus [] as we need them for ipv6 adresses, also allow ~)
  // also exclude as finals:
  // - final interpunction like ,.!?
  // - any sort of brackets <>()[]{} (not spec conform, but often used to enclose urls)
  // - unsafe chars from rfc1738: {}|\^~[]`
  const strictUrlRegex = /https?:[/]{2}[^\s"'!*(){}|\\\^<>`]*[^\s"':,.!?{}|\\\^~\[\]`()<>]/;
  /**
   * Parses an array of text lines and identifies URLs and email addresses, converting them into clickable links.
   *
   * @param lines - Array of line objects containing text to parse
   * @returns Array of LinePartCss objects with identified links and emails marked up
   */
  const parseLinks = (lines) => {
      const result = [];
      lines.forEach((line) => {
          // Split line into words
          const tokens = line.text.split(" ");
          let found = false; // Tracks if any links were found
          let partial = ""; // Accumulates non-link text
          tokens.forEach((token) => {
              // Check if text matches URL pattern
              if (token.search(strictUrlRegex) > -1) {
                  // Push accumulated non-link text if any
                  result.push({ text: partial.trimEnd() });
                  partial = "";
                  found = true;
                  // Check if text is an email address
                  if (token.search(emailRegex) > -1) {
                      result.push({ token, email: true });
                      return;
                  }
                  // Add https:// prefix if protocol is missing
                  if (token.search(protocolClause) === -1) {
                      result.push({ text: `https://${token}`, link: true });
                      return;
                  }
                  // Split text into protocol and non-protocol parts
                  const parts = token.split(new RegExp(/(\()*([^\)]+)(\))*/)).filter(Boolean);
                  parts.forEach((part) => {
                      if (part.search(protocolClause) > -1) {
                          result.push({ text: part, link: true });
                      }
                      else {
                          result.push({ text: part });
                      }
                  });
                  return;
              }
              // Accumulate non-link text
              partial += token + " ";
          });
          // If no links found, push the entire line
          if (!found) {
              result.push(line);
          }
      });
      return result;
  };

  var eventsource = (url, options) => {
      const { withCredentials, onOpen, onClose, onError, formatMessage } = options;
      const emitter = mitt();
      let encodedLog = new Uint8Array();
      let overage = null;
      emitter.on("data", (data) => {
          encodedLog = bufferConcat(encodedLog, encode(data));
          const { lines, remaining } = convertBufferToLines(encode(data), overage);
          overage = remaining;
          emitter.emit("update", { lines, encodedLog });
      });
      emitter.on("done", () => {
          if (overage) {
              emitter.emit("update", { lines: List.of(overage), encodedLog });
          }
          emitter.emit("end", encodedLog);
      });
      emitter.on("start", () => {
          try {
              // Create EventSource - it will handle reconnection automatically
              const eventSource = new EventSource(url, { withCredentials });
              eventSource.addEventListener("open", (e) => {
                  // relay on open events if a handler is registered
                  onOpen && onOpen(e, eventSource);
              });
              // Note: EventSource API doesn't have a 'close' event in the spec
              // This listener will never fire, but we keep it for backwards compatibility
              // in case any code depends on the onClose callback
              eventSource.addEventListener("close", (e) => {
                  onClose && onClose(e);
              });
              eventSource.addEventListener("error", (err) => {
                  onError && onError(err);
                  // EventSource will automatically reconnect after ~3 seconds
                  // unless options.reconnect is false.
                  //
                  // EventSource will also not reconnect if the server sends a
                  // 204 No Content response.
                  if (options.reconnect === false) {
                      eventSource.close();
                  }
              });
              eventSource.addEventListener("message", (e) => {
                  let msg = formatMessage ? formatMessage(e.data) : e.data;
                  if (typeof msg !== "string") {
                      return;
                  }
                  // add a new line character between each message if one doesn't exist.
                  // this allows our search index to properly distinguish new lines.
                  msg = msg.endsWith("\n") ? msg : `${msg}\n`;
                  emitter.emit("data", msg);
              });
              emitter.on("abort", () => {
                  // Close the EventSource when component unmounts
                  eventSource.close();
              });
          }
          catch (err) {
              emitter.emit("error", err);
          }
      });
      return emitter;
  };

  const fetcher$1 = Promise.resolve().then(() => globalThis.fetch);
  var request = (url, options) => {
      const emitter = mitt();
      emitter.on("start", async () => {
          try {
              const fetch = await fetcher$1;
              const response = await fetch(url, Object.assign({ credentials: "omit" }, options));
              if (!response.ok) {
                  const error = new Error(response.statusText);
                  // @ts-ignore
                  error["status"] = response.status;
                  emitter.emit("error", error);
                  return;
              }
              const arrayBuffer = await response.arrayBuffer();
              const encodedLog = new Uint8Array(arrayBuffer);
              const { lines } = convertBufferToLines(encodedLog);
              emitter.emit("update", {
                  lines: lines,
              });
              emitter.emit("end", encodedLog);
          }
          catch (err) {
              emitter.emit("error", err);
          }
      });
      return emitter;
  };

  /**
   * Implements the Knuth-Morris-Pratt (KMP) string searching algorithm.
   * This function searches for occurrences of a keyword within a given log.
   *
   * @param {string | undefined} rawKeywords - The search term to look for.
   * @param {Uint8Array} rawLog - The log data to search within.
   * @returns {number[]} An array of indices where the keyword is found in the log.
   */
  const searchIndexes = (rawKeywords, rawLog) => {
      // Encode the keywords for byte-level comparison
      const keywords = Array.from(encode(rawKeywords));
      // Initialize the KMP failure function table
      const table = [-1, 0];
      const keywordsLength = keywords.length;
      const fileLength = rawLog.length;
      const maxKeywordsIndex = keywordsLength - 1;
      let keywordsIndex = 0;
      let fileIndex = 0;
      let index = 0;
      let position = 2;
      // Build the KMP failure function table
      // This preprocessing step takes O(keywordsLength) time
      while (position < keywordsLength) {
          if (keywords[position - 1] === keywords[keywordsIndex]) {
              keywordsIndex += 1;
              table[position] = keywordsIndex;
              position += 1;
          }
          else if (keywordsIndex > 0) {
              keywordsIndex = table[keywordsIndex];
          }
          else {
              table[position] = 0;
              position += 1;
          }
      }
      const results = [];
      // Perform the KMP search
      // This main search step takes O(fileLength) time
      while (fileIndex + index < fileLength) {
          if (keywords[index] === rawLog[fileIndex + index]) {
              if (index === maxKeywordsIndex) {
                  // Found a match, store the starting index
                  results.push(fileIndex);
              }
              index += 1;
          }
          else if (table[index] > -1) {
              // Partial match, use the failure function to skip comparisons
              fileIndex = fileIndex + index - table[index];
              index = table[index];
          }
          else {
              // Mismatch, move to the next character in the file
              index = 0;
              fileIndex += 1;
          }
      }
      return results;
  };
  /**
   * Searches for keywords within log lines, handling case sensitivity.
   *
   * @param {string | undefined} rawKeywords - The search term to look for.
   * @param {Uint8Array} rawLog - The log data to search within.
   * @param {boolean} isCaseInsensitive - Whether the search should be case-insensitive.
   * @returns {number[]} An array of line numbers where the keyword is found.
   */
  const searchLines = (rawKeywords, rawLog, isCaseInsensitive) => {
      let keywords = rawKeywords;
      let log = rawLog;
      let decodedLog = decode(log);
      // Handle case sensitivity
      if (isCaseInsensitive) {
          keywords = keywords?.toLowerCase();
          decodedLog = decodedLog.toLowerCase();
      }
      // Ensure the log ends with a newline for consistent line handling
      decodedLog = decodedLog.endsWith("\n") ? decodedLog : decodedLog + "\n";
      log = encode(decodedLog);
      // Perform the search
      const results = searchIndexes(keywords, log);
      const linesRanges = getLinesLengthRanges(log);
      const maxLineRangeIndex = linesRanges.length;
      const maxResultIndex = results.length;
      const resultLines = [];
      let lineRangeIndex = 0;
      let resultIndex = 0;
      let lineRange;
      let result;
      // Map search results to line numbers
      while (lineRangeIndex < maxLineRangeIndex) {
          lineRange = linesRanges[lineRangeIndex];
          while (resultIndex < maxResultIndex) {
              result = results[resultIndex];
              if (result <= lineRange) {
                  // The search result is within the current line
                  resultLines.push(lineRangeIndex + 1);
                  resultIndex += 1;
              }
              else {
                  // Move to the next line
                  break;
              }
          }
          lineRangeIndex += 1;
      }
      return resultLines;
  };

  const fetcher = Promise.resolve().then(() => globalThis.fetch);
  const recurseReaderAsEvent = async (reader, emitter) => {
      const result = await reader.read();
      if (result.value) {
          emitter.emit("data", result.value);
      }
      if (!result.done) {
          return recurseReaderAsEvent(reader, emitter);
      }
      emitter.emit("done");
  };
  var stream = (url, options) => {
      const emitter = mitt();
      let overage = null;
      let encodedLog = new Uint8Array();
      emitter.on("data", (data) => {
          encodedLog = bufferConcat(encodedLog, new Uint8Array(data));
          const { lines, remaining } = convertBufferToLines(data, overage);
          overage = remaining;
          emitter.emit("update", { lines, encodedLog });
      });
      emitter.on("done", () => {
          if (overage) {
              emitter.emit("update", { lines: List.of(overage), encodedLog });
          }
          emitter.emit("end", encodedLog);
      });
      emitter.on("start", async () => {
          try {
              const fetch = await fetcher;
              const response = await fetch(url, Object.assign({ credentials: "omit" }, options));
              if (!response.ok) {
                  const error = new Error(response.statusText);
                  // @ts-ignore
                  error["status"] = response.status;
                  emitter.emit("error", error);
                  return;
              }
              const reader = response.body?.getReader();
              emitter.on("abort", () => reader?.cancel("ABORTED"));
              return recurseReaderAsEvent(reader, emitter);
          }
          catch (err) {
              emitter.emit("error", err);
          }
      });
      return emitter;
  };

  var websocket = (url, options) => {
      const { onOpen, onClose, onError, formatMessage, protocols } = options;
      const emitter = mitt();
      let encodedLog = new Uint8Array();
      let overage = null;
      let aborted = false;
      emitter.on("data", (data) => {
          encodedLog = bufferConcat(encodedLog, encode(data));
          const { lines, remaining } = convertBufferToLines(encode(data), overage);
          overage = remaining;
          emitter.emit("update", { lines, encodedLog });
      });
      emitter.on("done", () => {
          if (overage) {
              emitter.emit("update", { lines: List.of(overage), encodedLog });
          }
          emitter.emit("end", encodedLog);
      });
      emitter.on("start", () => {
          try {
              // try to connect to websocket
              const socket = new WebSocket(url, protocols);
              socket.addEventListener("open", (e) => {
                  // relay on open events if a handler is registered
                  onOpen && onOpen(e, socket);
              });
              socket.addEventListener("close", (e) => {
                  onClose && onClose(e);
                  if (!aborted && options.reconnect) {
                      const timeout = options.reconnectWait ?? 1;
                      setTimeout(() => emitter.emit("start"), timeout * 1000);
                  }
              });
              socket.addEventListener("error", (err) => {
                  onError && onError(err);
              });
              socket.addEventListener("message", (e) => {
                  let msg = formatMessage ? formatMessage(e.data) : e.data;
                  if (typeof msg !== "string") {
                      return;
                  }
                  // add a new line character between each message if one doesn't exist.
                  // this allows our search index to properly distinguish new lines.
                  msg = msg.endsWith("\n") ? msg : `${msg}\n`;
                  emitter.emit("data", msg);
              });
              emitter.on("abort", () => {
                  aborted = true;
                  socket.close();
              });
          }
          catch (err) {
              emitter.emit("error", err);
          }
      });
      return emitter;
  };

  var css_248z = ".index-module_lazyLog__4TukL {\n    overflow: auto !important;\n    font-family: \"Monaco\", monospace;\n    font-size: 12px;\n    margin: 0;\n    white-space: pre;\n    background-color: #222222;\n    color: #ffffff;\n    font-weight: 400;\n    will-change: initial;\n    outline: none;\n}\n\n.index-module_lazyLog__4TukL span a {\n    color: #d6d6d6;\n}\n\n.index-module_wrapLine__1TUVd {\n    overflow-x: hidden !important;\n}\n\n.index-module_searchMatch__o26h7 {\n    background-color: #ffff00;\n    color: #222222;\n}\n\n.index-module_searchMatchHighlighted__fKXBW {\n    background-color: #ff10f0;\n    color: #222222;\n}\n";
  var styles = {"lazyLog":"index-module_lazyLog__4TukL","wrapLine":"index-module_wrapLine__1TUVd","searchMatch":"index-module_searchMatch__o26h7","searchMatchHighlighted":"index-module_searchMatchHighlighted__fKXBW"};
  styleInject(css_248z);

  /**
   * React component that loads and views remote text in the browser lazily and efficiently.
   * Logs can be loaded from static text, a URL, or a WebSocket and including ANSI highlighting.
   */
  class LazyLog extends React.Component {
      constructor() {
          super(...arguments);
          this.state = {
              resultLines: [],
              count: 0,
              currentResultsPosition: 0,
              isFilteringLinesWithMatches: false,
              isSearching: false,
              offset: 0,
              resultLineUniqueIndexes: [],
              scrollOffset: 0,
              scrollToIndex: 0,
              scrollToLine: 0,
              lines: List(),
          };
          this.emitter = undefined;
          this.encodedLog = undefined;
          this.searchBarRef = React__default["default"].createRef();
          this.listRef = React__default["default"].createRef();
          this.handleUpdate = ({ lines: moreLines, encodedLog }) => {
              this.encodedLog = encodedLog;
              const { scrollToLine, follow, stream, websocket, eventsource, external, } = this.props;
              // handle stream, socket and eventsource updates batched update mode
              if (stream || websocket || eventsource || external) {
                  this.setState((state, props) => {
                      const { scrollToLine, follow } = props;
                      const { count: previousCount } = state;
                      const offset = 0;
                      const lines = (state.lines || List()).concat(moreLines);
                      const count = lines.count();
                      const scrollToIndex = getScrollIndex({
                          follow,
                          scrollToLine,
                          previousCount,
                          count,
                          offset,
                      });
                      return {
                          lines,
                          offset,
                          count,
                          scrollToIndex,
                      };
                  });
                  this.forceSearch();
              }
              else {
                  // regular text update in normal react hook mode
                  const { count: previousCount } = this.state;
                  const offset = 0;
                  const lines = (this.state.lines || List()).concat(moreLines);
                  const count = lines.count();
                  const scrollToIndex = getScrollIndex({
                      follow,
                      scrollToLine,
                      previousCount,
                      count,
                      offset,
                  });
                  this.setState({
                      lines,
                      offset,
                      count,
                      scrollToIndex,
                  });
              }
          };
          this.handleEnd = (encodedLog) => {
              this.encodedLog = encodedLog;
              this.setState({ loaded: true });
              if (this.props.onLoad) {
                  this.props.onLoad();
              }
          };
          this.handleError = (err) => {
              this.setState({ error: err });
              if (this.props.onError) {
                  this.props.onError(err);
              }
          };
          this.handleHighlight = (e) => {
              const { onHighlight, enableMultilineHighlight } = this.props;
              const { isFilteringLinesWithMatches } = this.state;
              if (!e.currentTarget.id) {
                  return;
              }
              const lineNumber = +e.currentTarget.id;
              if (!lineNumber) {
                  return;
              }
              const first = this.state.highlight?.first();
              const last = this.state.highlight?.last();
              let range;
              if (first === lineNumber) {
                  range = null;
              }
              else if (!e.shiftKey || !first) {
                  range = lineNumber;
              }
              else if (enableMultilineHighlight && lineNumber > first) {
                  range = [first, lineNumber];
              }
              else if (!enableMultilineHighlight && lineNumber > first) {
                  range = lineNumber;
              }
              else {
                  range = [lineNumber, last];
              }
              const highlight = getHighlightRange(range);
              const state = { highlight };
              if (isFilteringLinesWithMatches) {
                  Object.assign(state, {
                      scrollToIndex: getScrollIndex({ scrollToLine: lineNumber }),
                  });
              }
              this.setState(state, () => {
                  if (onHighlight) {
                      onHighlight(highlight);
                  }
                  if (isFilteringLinesWithMatches) {
                      this.handleFilterLinesWithMatches(false);
                  }
              });
              return highlight;
          };
          this.handleEnterPressed = () => {
              const { resultLines, scrollToLine, currentResultsPosition, isFilteringLinesWithMatches, } = this.state;
              if (!this.props.enableSearchNavigation) {
                  this.handleFilterLinesWithMatches(!isFilteringLinesWithMatches);
                  return;
              }
              // If we have search results
              if (resultLines) {
                  // If we already scrolled to a line
                  if (scrollToLine) {
                      // Scroll to the next line if possible,
                      // wrap to the top if we're at the end.
                      if (currentResultsPosition + 1 < resultLines.length) {
                          this.handleScrollToLine(resultLines[currentResultsPosition + 1]);
                          this.setState({
                              currentResultsPosition: currentResultsPosition + 1,
                          });
                          return;
                      }
                  }
                  this.handleScrollToLine(resultLines[0]);
                  this.setState({ currentResultsPosition: 0 });
              }
          };
          this.handleShiftEnterPressed = () => {
              const { resultLines, scrollToLine, currentResultsPosition } = this.state;
              if (!this.props.enableSearchNavigation) {
                  return;
              }
              // If we have search results
              if (resultLines) {
                  // If we already scrolled to a line
                  if (scrollToLine) {
                      // Scroll to the previous line if possible,
                      // wrap to the bottom if we're at the top.
                      if (currentResultsPosition - 1 >= 0) {
                          this.handleScrollToLine(resultLines[currentResultsPosition - 1]);
                          this.setState({
                              currentResultsPosition: currentResultsPosition - 1,
                          });
                          return;
                      }
                  }
                  this.handleScrollToLine(resultLines[resultLines.length - 1]);
                  this.setState({ currentResultsPosition: resultLines.length - 1 });
              }
          };
          this.handleSearch = (keywords) => {
              const { resultLines, searchKeywords, currentResultsPosition: previousResultsPosition, } = this.state;
              const { caseInsensitive, stream, websocket, eventsource, external } = this.props;
              const currentResultLines = !stream &&
                  !websocket &&
                  !eventsource &&
                  !external &&
                  keywords === searchKeywords
                  ? resultLines
                  : searchLines(keywords, this.encodedLog, caseInsensitive);
              let currentResultsPosition = previousResultsPosition;
              if (currentResultsPosition > currentResultLines.length - 1) {
                  currentResultsPosition = 0;
              }
              this.setState({
                  resultLines: currentResultLines,
                  isSearching: true,
                  searchKeywords: keywords,
                  currentResultsPosition,
              }, this.filterLinesWithMatches);
          };
          this.forceSearch = () => {
              const { searchKeywords } = this.state;
              const { searchMinCharacters } = this.props;
              if (searchKeywords &&
                  searchKeywords.length > (searchMinCharacters || 0)) {
                  this.handleSearch(this.state.searchKeywords);
              }
          };
          this.handleClearSearch = () => {
              this.setState({
                  isSearching: false,
                  searchKeywords: "",
                  resultLines: [],
                  filteredLines: List(),
                  resultLineUniqueIndexes: [],
                  isFilteringLinesWithMatches: this.state.isFilteringLinesWithMatches,
                  scrollToIndex: 0,
                  currentResultsPosition: 0,
              });
          };
          this.handleFilterLinesWithMatches = (isFilterEnabled) => {
              this.setState({
                  isFilteringLinesWithMatches: isFilterEnabled,
                  filteredLines: List(),
                  resultLineUniqueIndexes: [],
              }, this.filterLinesWithMatches);
          };
          this.filterLinesWithMatches = () => {
              const { resultLines, lines, isFilteringLinesWithMatches } = this.state;
              if (resultLines.length > 0 && isFilteringLinesWithMatches) {
                  const resultLineUniqueIndexes = [...new Set(resultLines)];
                  this.setState({
                      resultLineUniqueIndexes,
                      filteredLines: lines?.filter((_line, index) => resultLineUniqueIndexes.some((resultLineIndex) => index + 1 === resultLineIndex)),
                  });
              }
          };
          this.handleFormatPart = (lineNumber) => {
              const { isSearching, searchKeywords, resultLines, currentResultsPosition, } = this.state;
              const { enableSearchNavigation } = this.props;
              if (isSearching) {
                  // If browser-search has started and we're on the line
                  // that has the search term that is selected
                  if (enableSearchNavigation &&
                      resultLines &&
                      currentResultsPosition !== undefined &&
                      resultLines[currentResultsPosition] === lineNumber) {
                      let locationInLine = 0;
                      // Find the first occurrence of the line number
                      // We use this to make sure we're only searching from where
                      // the line number first occurs to the currentResultsPosition below
                      const initialOccurrence = resultLines.findIndex((element) => element === resultLines[currentResultsPosition]);
                      // This finds which word in the line should be the highlighted one.
                      // For example, if we should be highlighting the 2nd match on line 18,
                      // this would set locationInLine to 2.
                      for (let i = initialOccurrence; i <= currentResultsPosition; i += 1) {
                          if (resultLines[i] === lineNumber) {
                              locationInLine += 1;
                          }
                      }
                      return searchFormatPart({
                          searchKeywords,
                          nextFormatPart: undefined,
                          caseInsensitive: this.props.caseInsensitive,
                          replaceJsx: (text, key) => (React__default["default"].createElement("span", { key: key, className: styles.searchMatch }, text)),
                          selectedLine: true,
                          replaceJsxHighlight: (text, key) => (React__default["default"].createElement("span", { key: key, className: styles.searchMatchHighlighted }, text)),
                          highlightedWordLocation: locationInLine,
                      });
                  }
                  return searchFormatPart({
                      searchKeywords,
                      nextFormatPart: undefined,
                      caseInsensitive: this.props.caseInsensitive,
                      replaceJsx: (text, key) => (React__default["default"].createElement("span", { key: key, className: styles.searchMatch }, text)),
                      selectedLine: undefined,
                      replaceJsxHighlight: undefined,
                      highlightedWordLocation: undefined,
                  });
              }
              return this.props.formatPart;
          };
          this.renderRow = (options) => {
              const { rowHeight, selectableLines, lineClassName, highlightLineClassName, onLineNumberClick, onLineContentClick, gutter, enableGutters, enableLineNumbers, wrapLines, enableLinks, } = this.props;
              const { highlight, lines, offset, isFilteringLinesWithMatches, filteredLines, resultLineUniqueIndexes, } = this.state;
              const linesToRender = isFilteringLinesWithMatches
                  ? filteredLines
                  : lines;
              const number = isFilteringLinesWithMatches
                  ? resultLineUniqueIndexes[options.index]
                  : options.index + 1 + offset;
              if (linesToRender?.size <= 0) {
                  return this.renderNoRows();
              }
              if (!number) {
                  // A falsy number can only be a result of displaying filtered lines with extraLines, and this row is an extraLine.
                  // In this case, do not render anything.
                  return undefined;
              }
              const decodedLine = decode(linesToRender?.get(options.index));
              const parsedData = enableLinks
                  ? parseLinks(ansiparse(decodedLine))
                  : ansiparse(decodedLine);
              return (React__default["default"].createElement(Line, { className: `log-line ${lineClassName}`, data: parsedData, enableGutters: enableGutters, wrapLines: wrapLines, enableLineNumbers: enableLineNumbers, enableLinks: enableLinks, formatPart: this.handleFormatPart(number), gutter: gutter ? gutter[number] : undefined, highlight: highlight?.includes(number), highlightClassName: `log-highlight ${highlightLineClassName}`, key: options.index, number: number, rowHeight: rowHeight, selectable: selectableLines, onLineNumberClick: (e) => {
                      const highlighted = this.handleHighlight(e);
                      onLineNumberClick?.({
                          lineNumber: number,
                          highlightRange: highlighted,
                      });
                  }, onLineContentClick: onLineContentClick }));
          };
          this.renderNoRows = () => {
              const { lineClassName, highlightLineClassName, wrapLines } = this.props;
              const { error, count, loaded } = this.state;
              if (error) {
                  return this.renderError();
              }
              // Handle case where log is empty
              if (!count && loaded) {
                  return React__default["default"].createElement(React__default["default"].Fragment, null);
              }
              // We don't do `if (loaded) {}` in order to handle
              // the edge case where the log is streaming
              if (count) {
                  return (React__default["default"].createElement(Line, { wrapLines: wrapLines, className: lineClassName, highlightClassName: highlightLineClassName, data: [{ bold: true, text: "No filter matches" }] }));
              }
              return this.props.loadingComponent || React__default["default"].createElement(Loading, null);
          };
          this.calculateListHeight = (useCSSStyle = false) => {
              const { height, enableSearch } = this.props;
              if (!this.listRef?.current) {
                  return 0;
              }
              const viewportHeight = this.listRef.current.viewportSize;
              const searchBarHeightAdjustment = enableSearch ? SEARCH_BAR_HEIGHT : 0;
              if (height === "auto") {
                  if (useCSSStyle) {
                      return enableSearch
                          ? `calc(100% - ${SEARCH_BAR_HEIGHT}px)`
                          : "100%";
                  }
                  else {
                      return viewportHeight;
                  }
              }
              else {
                  return Number(height) - searchBarHeightAdjustment;
              }
          };
          this.getItemSize = (index) => this.props.rowHeight || 19;
      }
      static getDerivedStateFromProps({ highlight, follow, scrollToLine, url: nextUrl, text: nextText, }, { count, offset, url: previousUrl, text: previousText, highlight: previousHighlight, isSearching, scrollToIndex, }) {
          const newScrollToIndex = isSearching
              ? scrollToIndex
              : getScrollIndex({ follow, scrollToLine, count, offset });
          const shouldUpdate = (nextUrl && nextUrl !== previousUrl) ||
              (nextText && nextText !== previousText);
          return {
              scrollToIndex: newScrollToIndex,
              highlight: previousHighlight === Range(0, 0)
                  ? getHighlightRange(highlight)
                  : previousHighlight || getHighlightRange(previousHighlight),
              ...(shouldUpdate
                  ? {
                      url: nextUrl,
                      text: nextText,
                      lines: List(),
                      count: 0,
                      offset: 0,
                      loaded: false,
                      error: null,
                  }
                  : null),
          };
      }
      componentDidMount() {
          this.request();
          if (this.props.scrollToLine) {
              setTimeout(() => {
                  if (this.listRef && this.listRef.current) {
                      this.handleScrollToLine(this.props.scrollToLine);
                  }
              }, 100);
          }
      }
      /**
       * Lifecycle method called after component updates. Handles various side effects and updates based on prop/state changes.
       * @param prevProps - Previous props before update
       * @param prevState - Previous state before update
       */
      componentDidUpdate(prevProps, prevState) {
          // Destructure commonly used props and state
          const { props, state, listRef } = this;
          const { url, // URL to fetch log from
          text, // Direct text content
          follow, // Whether to auto-scroll to bottom
          extraLines, // Additional lines to render
          onLoad, // Callback when log loads
          onError, // Callback when error occurs
          highlight, // Lines to highlight
          onHighlight, // Callback when highlight changes
          scrollToLine, // Line number to scroll to
           } = props;
          const { scrollOffset, scrollToIndex, isSearching, loaded, error } = state;
          // Check if the data source (url or text) has changed
          const isDataChanged = prevProps.url !== url ||
              prevState.url !== state.url ||
              prevProps.text !== text;
          // If data source changed, make a new request
          if (isDataChanged) {
              this.request();
          }
          // If data changed and we're not following, maintain scroll position
          if (isDataChanged && !follow && scrollOffset > 0) {
              listRef?.current?.scrollTo(scrollOffset);
          }
          // Detect if user is manually scrolling
          const isScrolling = prevState.scrollOffset != scrollOffset;
          // Auto-scroll to bottom if:
          // - follow mode is enabled
          // - not currently searching
          // - user is not manually scrolling
          if (follow && !isSearching && !isScrolling) {
              listRef?.current?.scrollToIndex(scrollToIndex + (extraLines || 0), {
                  align: "nearest",
              });
          }
          // Handle load state changes:
          // - Call onLoad when loading completes
          // - Call onError when error occurs
          if (!loaded && prevState.loaded !== loaded && onLoad) {
              onLoad();
          }
          else if (error && prevState.error !== error && onError) {
              onError(error);
          }
          // Handle highlight prop changes
          const isHighlightChanged = highlight && highlight !== prevProps.highlight;
          if (isHighlightChanged && onHighlight) {
              onHighlight(state.highlight);
          }
          // Handle scrollToLine prop changes
          // Only scroll if not in follow mode
          const isScrollToLineChanged = scrollToLine && prevProps.scrollToLine !== scrollToLine;
          if (!follow && isScrollToLineChanged) {
              this.handleScrollToLine(scrollToLine);
          }
      }
      componentWillUnmount() {
          this.endRequest();
      }
      initEmitter() {
          const { stream: isStream, websocket: isWebsocket, eventsource: isEventsource, url, fetchOptions, websocketOptions, eventsourceOptions, } = this.props;
          if (isWebsocket) {
              return websocket(url, websocketOptions);
          }
          if (isEventsource) {
              return eventsource(url, eventsourceOptions);
          }
          if (isStream) {
              return stream(url, fetchOptions);
          }
          return request(url, fetchOptions);
      }
      request() {
          const { text, url, external } = this.props;
          this.endRequest();
          if (text) {
              const encodedLog = encode(text);
              const { lines } = convertBufferToLines(encodedLog);
              this.handleUpdate({
                  lines: lines,
                  encodedLog,
              });
              this.handleEnd(encodedLog);
          }
          if (url) {
              this.emitter = this.initEmitter();
              this.emitter.on("update", this.handleUpdate);
              this.emitter.on("end", this.handleEnd);
              this.emitter.on("error", this.handleError);
              this.emitter.emit("start");
          }
          if (external) {
              const encodedLog = encode("");
              const { lines } = convertBufferToLines(encodedLog);
              this.handleUpdate({
                  lines,
                  encodedLog,
              });
          }
      }
      endRequest() {
          if (this.emitter) {
              this.emitter.emit("abort");
              this.emitter.off("update", this.handleUpdate);
              this.emitter.off("end", this.handleEnd);
              this.emitter.off("error", this.handleError);
              this.emitter = null;
          }
      }
      appendLines(newLines) {
          const content = newLines.join("\n");
          const newContent = encode(content.endsWith("\n") ? content : content + "\n");
          const encodedLog = bufferConcat(this.encodedLog, newContent);
          const { lines } = convertBufferToLines(newContent);
          this.handleUpdate({
              lines: lines,
              encodedLog,
          });
      }
      handleScrollToLine(scrollToLine = 0) {
          const scrollToIndex = getScrollIndex({
              scrollToLine,
          });
          this.setState({
              scrollToIndex,
              scrollToLine,
          });
          this.listRef?.current?.scrollToIndex(scrollToIndex, {
              align: "nearest",
          });
      }
      renderError() {
          const { url, lineClassName, selectableLines, highlightLineClassName, enableLinks, wrapLines, } = this.props;
          const { error } = this.state;
          return (React__default["default"].createElement(React.Fragment, null,
              React__default["default"].createElement(Line, { wrapLines: wrapLines, selectable: selectableLines, className: lineClassName, highlightClassName: highlightLineClassName, enableLinks: enableLinks, number: "Error", key: "error-line-0", data: [
                      {
                          bold: true,
                          foreground: "red",
                          text: error?.status
                              ? `${error?.message} (HTTP ${error?.status})`
                              : error?.message || "Network Error",
                      },
                  ] }),
              React__default["default"].createElement(Line, { wrapLines: wrapLines, selectable: selectableLines, key: "error-line-1", className: lineClassName, highlightClassName: highlightLineClassName, enableLinks: enableLinks, data: [
                      {
                          bold: true,
                          text: "An error occurred attempting to load the provided log.",
                      },
                  ] }),
              React__default["default"].createElement(Line, { wrapLines: wrapLines, selectable: selectableLines, key: "error-line-2", className: lineClassName, highlightClassName: highlightLineClassName, enableLinks: enableLinks, data: [
                      {
                          bold: true,
                          text: "Please check the URL and ensure it is reachable.",
                      },
                  ] }),
              React__default["default"].createElement(Line, { wrapLines: wrapLines, selectable: selectableLines, key: "error-line-3", className: lineClassName, highlightClassName: highlightLineClassName, enableLinks: enableLinks, data: [] }),
              React__default["default"].createElement(Line, { wrapLines: wrapLines, selectable: selectableLines, key: "error-line-4", className: lineClassName, highlightClassName: highlightLineClassName, enableLinks: enableLinks, data: [
                      {
                          foreground: "blue",
                          text: url,
                      },
                  ] })));
      }
      /**
       * Clears the log and search
       */
      clear() {
          this.searchBarRef.current?.setState({ keywords: "" });
          this.handleClearSearch();
          this.setState({
              count: 0,
              lines: List(),
              isFilteringLinesWithMatches: false,
          });
      }
      render() {
          const { enableSearch } = this.props;
          const { resultLines, isFilteringLinesWithMatches, filteredLines = List(), count, currentResultsPosition, } = this.state;
          const rowCount = isFilteringLinesWithMatches
              ? filteredLines.size
              : count;
          return (React__default["default"].createElement(React.Fragment, null,
              enableSearch && (React__default["default"].createElement(SearchBar, { ref: this.searchBarRef, currentResultsPosition: currentResultsPosition, disabled: count === 0, enableHotKeys: this.props.enableHotKeys, enableSearchNavigation: this.props.enableSearchNavigation, filterActive: isFilteringLinesWithMatches, iconFilterLines: this.props.iconFilterLines, iconFindNext: this.props.iconFindNext, iconFindPrevious: this.props.iconFindPrevious, onClearSearch: this.handleClearSearch, onEnter: this.handleEnterPressed, onFilterLinesWithMatches: this.handleFilterLinesWithMatches, onSearch: this.handleSearch, onShiftEnter: this.handleShiftEnterPressed, resultsCount: resultLines.length, searchMinCharacters: this.props.searchMinCharacters })),
              React__default["default"].createElement(ne, { ref: this.listRef, className: `react-lazylog ${styles.lazyLog} ${this.props.wrapLines ? styles.wrapLine : ""}`, style: { height: this.calculateListHeight(true) }, onScroll: (offset) => {
                      this.setState({
                          scrollOffset: offset,
                      });
                      // If there is an onScroll callback, call it.
                      if (this.props.onScroll) {
                          if (!this.listRef?.current) {
                              return;
                          }
                          const args = {
                              scrollTop: offset,
                              scrollHeight: this.listRef.current.scrollSize,
                              clientHeight: this.calculateListHeight(),
                          };
                          this.props.onScroll(args);
                      }
                  } },
                  Array.from({
                      length: rowCount === 0
                          ? rowCount
                          : rowCount + (this.props.extraLines || 0),
                  }).map((_, i) => this.renderRow({ index: i })),
                  this.props.loading === true &&
                      (this.props.loadingComponent || React__default["default"].createElement(Loading, null)))));
      }
  }
  LazyLog.defaultProps = {
      containerStyle: {
          width: "auto",
          maxWidth: "initial",
          overflow: "initial",
      },
      caseInsensitive: false,
      enableGutters: false,
      enableHotKeys: false,
      enableLineNumbers: true,
      enableLinks: false,
      enableMultilineHighlight: true,
      enableSearch: false,
      enableSearchNavigation: true,
      wrapLines: false,
      extraLines: 0,
      fetchOptions: { credentials: "omit" },
      follow: false,
      formatPart: undefined,
      height: "auto",
      highlight: undefined,
      highlightLineClassName: "",
      lineClassName: "",
      onError: undefined,
      onHighlight: undefined,
      onLineNumberClick: undefined,
      onLoad: undefined,
      loading: undefined,
      overscanRowCount: 100,
      rowHeight: 19,
      scrollToLine: 0,
      searchMinCharacters: 2,
      selectableLines: false,
      stream: false,
      style: {},
      websocket: false,
      websocketOptions: {},
      eventsource: false,
      eventsourceOptions: {},
      width: "auto",
      external: false,
  };

  class ScrollFollow extends React.Component {
      constructor() {
          super(...arguments);
          // Initial state is the startFollowing prop.
          this.state = {
              follow: this.props.startFollowing ?? false,
          };
          this.handleScroll = ({ scrollTop, scrollHeight, clientHeight }) => {
              // Only update the state if the content exceeds the available space
              // otherwise the follow will be disabled before the screen is filled.
              if (scrollHeight > clientHeight) {
                  if (this.state.follow &&
                      scrollHeight - scrollTop !== clientHeight) {
                      // Disable follow, if we're currently following and have manually scrolled away from the bottom.
                      this.setState({ follow: false });
                  }
                  else if (!this.state.follow &&
                      scrollHeight - scrollTop === clientHeight) {
                      // Enable follow if we are not currently following and have scrolled to the bottom.
                      this.setState({ follow: true });
                  }
              }
          };
          this.startFollowing = () => {
              this.setState({ follow: true });
          };
          this.stopFollowing = () => {
              this.setState({ follow: false });
          };
      }
      render() {
          const { render } = this.props;
          const { follow } = this.state;
          return (React__default["default"].createElement(React.Fragment, null, render({
              follow,
              onScroll: this.handleScroll,
              startFollowing: this.startFollowing,
              stopFollowing: this.stopFollowing,
          })));
      }
  }
  ScrollFollow.defaultProps = {
      startFollowing: false,
  };

  exports.DownArrowIcon = DownArrowIcon;
  exports.FilterLinesIcon = FilterLinesIcon;
  exports.LazyLog = LazyLog;
  exports.Line = Line;
  exports.LineContent = LineContent;
  exports.LineGutter = LineGutter;
  exports.LineNumber = LineNumber;
  exports.LinePart = LinePart;
  exports.Loading = Loading;
  exports.ScrollFollow = ScrollFollow;
  exports.SearchBar = SearchBar;
  exports.UpArrowIcon = UpArrowIcon;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=index.js.map
