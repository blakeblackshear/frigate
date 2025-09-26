(() => {
  // node_modules/@okikio/sharedworker/lib/index.mjs
  var r = "SharedWorker" in globalThis;
  var e = class {
    constructor(e2, t) {
      this.ActualWorker = r ? new SharedWorker(e2, t) : new Worker(e2, t);
    }
    get onmessage() {
      return r ? this.ActualWorker?.port.onmessage : this.ActualWorker.onmessage;
    }
    set onmessage(e2) {
      r ? this.ActualWorker.port.onmessage = e2 : this.ActualWorker.onmessage = e2;
    }
    get onmessageerror() {
      return r ? this.ActualWorker?.port.onmessageerror : this.ActualWorker.onmessageerror;
    }
    set onmessageerror(e2) {
      r ? this.ActualWorker.port.onmessageerror = e2 : this.ActualWorker.onmessageerror = e2;
    }
    start() {
      if (r)
        return this.ActualWorker?.port.start();
    }
    postMessage(e2, t) {
      return r ? this.ActualWorker?.port.postMessage(e2, t) : this.ActualWorker.postMessage(e2, t);
    }
    terminate() {
      return r ? this.ActualWorker?.port.close() : this.ActualWorker.terminate();
    }
    close() {
      return this.terminate();
    }
    get port() {
      return r ? this.ActualWorker.port : this.ActualWorker;
    }
    get onerror() {
      return this.ActualWorker.onerror;
    }
    set onerror(r2) {
      this.ActualWorker.onerror = r2;
    }
    addEventListener(e2, t, o) {
      return r && e2 !== "error" ? this.ActualWorker?.port.addEventListener(e2, t, o) : this.ActualWorker.addEventListener(e2, t, o);
    }
    removeEventListener(e2, t, o) {
      return r && e2 !== "error" ? this.ActualWorker?.port.removeEventListener(e2, t, o) : this.ActualWorker.removeEventListener(e2, t, o);
    }
    dispatchEvent(r2) {
      return this.ActualWorker.dispatchEvent(r2);
    }
  };

  // test/src/worker/share.worker.js
  var NewWorker = new e("", {
    name: "typescript-worker"
  });
  NewWorker.start();
})();
