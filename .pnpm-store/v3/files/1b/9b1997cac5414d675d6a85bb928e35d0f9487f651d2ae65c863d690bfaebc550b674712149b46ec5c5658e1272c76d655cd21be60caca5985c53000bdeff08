# thingies

Useful TypeScript utilities.

- [__Code reference__](https://streamich.github.io/thingies).
- [__Test coverage__](https://streamich.github.io/thingies/coverage/lcov-report).


## Menu

- `base64` &mdash; Base64 encoding end decoding functions for Node.js.

---

- `Cache` &mdash; implementation of local memory cache for database records. Can cache
  retrieved database records for few dozen seconds and has garbage collection logic
  which clears the memory of old items after some time.

---

- `Defer` &mdash; an inverted `Promise`, an object which allows you to imperatively
  control the behavior of a `Promise`.

---

- `@debug` &mdash; a class method or function decorator, which logs
  the input and output of the function in non-production environments.

---

- `hash` &mdash; a fast and simple utility, which hashes a string to an integer. Useful
  for generating a shard index of a record based on its ID.

---

- `LruMap` &mdash; tiny and fast *Least Recently Used Cache* implemented on top of the `Map` class.
  The default limit is around 1 billion items (2^30 - 1).

---

- `LruTtlMap` &mdash; tiny and fast *Least Recently Used Cache* with expiration timestamp
  stored for each entry implemented on top of the `LruMap` class.

---

- `LruCache` &mdash; a *Least Recently Used Cache* implemented using `Object` and doubly linked list.
  The default limit is around 1 billion items (2^30 - 1).

---

- `normalizeEmail` &mdash; normalizes email by stripping out `.` and `+` characters and
  removing everything after the `+` character and lower-casing the e-mail. Useful for
  getting an e-mail into a common form when throttling requests by e-mail.

---

- `of` &mdash; returns result of a `Promise` as a 3-tuple `[value, error, isError]`.

---

- `promiseMap` &mdash; maps a list of values to an async function and waits until
  all results complete execution.

---

- `randomStr` &mdash; generates a random string of given size. Alphabet for character
  picking can be provided. Useful for generating random database record IDs.

---

- `TimedQueue` &mdash; a queue which can be flushed manually, or which flushes
  automatically when the number of queued items reaches a threshold or when a timeout
  expires since the first item was added to the queue. Useful for batching multiple
  messages or requests for bulk processing.

---

- `TimedState` &mdash; works similar to `TimedQueue`, but instead of keeping track of
  all items pushed, it invokes a reducer to update the state with the information from
  the last pushed item.

---

- `tick` &mdash; returns a `Promise` which resolves after a given number of milliseconds,
  useful for releasing the event loop for a short period of time, `await tick(5)`.

---

- `until` &mdash; waits for some condition to become true `await until(() => condition)`,
  useful when waiting for some asynchronous task to happen in a test.

---

- `concurrency` &mdash; limits the number of concurrent executions of asynchronous
  code. `concurrencyDecorator` limits the number of concurrent executions of a
  class method.

---

- `codeMutex` &mdash; a mutex which can be used to synchronize code execution. Code
  wrapped by this mutex will execute only one at a time, for all parallel calls to
  the same mutex.

- `@mutex` and `mutex()` &mdash; same as `codeMutex`, but can be used as a decorator
  or a higher order function.

---

- `once` &mdash; a class method decorator, which limits method execution to once
  per instance. Returns the result of the first execution for all subsequent calls.

---

- `loadCss` &mdash; loads a CSS file into the DOM, given a URL. Does nothing on the
  server.

---

- `dataUri` &mdash; converts a string to a data URI.

---

- `FanOut` &mdash; a class which allows to fan out a single event to multiple
  listeners. Useful for implementing event emitters. In just 12 lines of code.

---

- `createRace` &mdash; constructs a "race" function, which takes a function as
  a single argument, the function is executed immediately only if no other
  function is currently executing. If another function is currently executing,
  the current function is discarded.

---

- `xorShift32` &mdash; generates random 32-bit integers using the very fast xorshift
  algorithm. `makeXorShift32(seed)` returns a function which can be used to generate
  random numbers.

---

- `Locks` &mdash; a lock manager, which allows to acquire an exclusive lock in
browser across multiple tabs. Acquires a lock by writing to `localStorage` for
a specific key for a specified duration.

---

- `hasKeys` &mdash; returns `true` if an object has at lest on key.

---

- `timeout` &mdash; waits for async code to complete within a given time frame,
  otherwise throws an error.


## License

[MIT © Vadim Dalecky](LICENSE).
