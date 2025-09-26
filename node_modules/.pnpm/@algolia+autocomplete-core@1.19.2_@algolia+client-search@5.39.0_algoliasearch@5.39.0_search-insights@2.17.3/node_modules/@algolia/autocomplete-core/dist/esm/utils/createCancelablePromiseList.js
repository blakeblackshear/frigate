// Ensures multiple callers sync to the same promise.
var _hasWaitPromiseResolved = true;
var _waitPromise;
export function createCancelablePromiseList() {
  var list = [];
  return {
    add: function add(cancelablePromise) {
      list.push(cancelablePromise);
      return cancelablePromise.finally(function () {
        list = list.filter(function (item) {
          return item !== cancelablePromise;
        });
      });
    },
    cancelAll: function cancelAll() {
      list.forEach(function (promise) {
        return promise.cancel();
      });
    },
    isEmpty: function isEmpty() {
      return list.length === 0;
    },
    wait: function wait(timeout) {
      // Reuse promise if already exists. Keeps multiple callers subscribed to the same promise.
      if (!_hasWaitPromiseResolved) {
        return _waitPromise;
      }

      // Creates a promise which either resolves after all pending requests complete
      // or the timeout is reached (if provided). Whichever comes first.
      _hasWaitPromiseResolved = false;
      _waitPromise = !timeout ? Promise.all(list) : Promise.race([Promise.all(list), new Promise(function (resolve) {
        return setTimeout(resolve, timeout);
      })]);
      return _waitPromise.then(function () {
        _hasWaitPromiseResolved = true;
      });
    }
  };
}